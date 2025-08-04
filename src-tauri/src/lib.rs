use base64::{engine::general_purpose, Engine as _};
use image::load_from_memory;
use lancedb::Connection;
use paddle_ocr_rs::ocr_lite::OcrLite;
use std::sync::Mutex;
use tauri::path::BaseDirectory;
use tauri::Manager;
use tauri::RunEvent;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

mod database;
mod embeddings;

struct InferenceServer(Mutex<Option<CommandChild>>);

struct EmbeddingServer(Mutex<Option<CommandChild>>);

#[tauri::command]
async fn process_image(base64_image: String, handle: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let image_bytes = general_purpose::STANDARD
            .decode(&base64_image)
            .map_err(|e| e.to_string())?;
        let img = load_from_memory(&image_bytes)
            .map_err(|e| e.to_string())?
            .to_rgb8();
        let mut ocr = OcrLite::new();
        let first_model_path = handle
            .path()
            .resolve(
                "ocr_models/ch_PP-OCRv5_mobile_det.onnx",
                BaseDirectory::Resource,
            )
            .map_err(|e| e.to_string())?
            .display()
            .to_string();
        let second_model_path = handle
            .path()
            .resolve(
                "ocr_models/ch_ppocr_mobile_v2.0_cls_infer.onnx",
                BaseDirectory::Resource,
            )
            .map_err(|e| e.to_string())?
            .display()
            .to_string();
        let third_model_path = handle
            .path()
            .resolve(
                "ocr_models/ch_PP-OCRv5_rec_mobile_infer.onnx",
                BaseDirectory::Resource,
            )
            .map_err(|e| e.to_string())?
            .display()
            .to_string();

        ocr.init_models(&first_model_path, &second_model_path, &third_model_path, 6)
            .map_err(|e| e.to_string())?;
        let res = ocr
            .detect(&img, 50, 1024, 0.5, 0.3, 1.6, true, false)
            .map_err(|e| e.to_string())?;
        let mut text = "".to_string();
        for item in res.text_blocks {
            // println!("text: {} score: {}", item.text, item.text_score);
            text.push_str(&format!("{} ", &item.text));
        }
        // println!("Extracted Text: ");
        // println!("{}", text);
        Ok(text)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(InferenceServer(Mutex::new(Option::<CommandChild>::None)))
        .manage(EmbeddingServer(Mutex::new(Option::<CommandChild>::None)))
        .manage(Mutex::new(Option::<Connection>::None))
        .setup(|app| {
            // Only spawn once when the Tauri app launches
            let (mut _rx_infer, child_infer) = app
                .shell()
                .sidecar("llama-server")
                .expect("Failed to get sidecar")
                .args([
                    "-m",
                    "./model.gguf",
                    "--gpu-layers",
                    "100",
                    "--ctx-size",
                    "8000",
                ])
                .spawn()
                .expect("Failed to spawn inference server");

            let infer_state = app.state::<InferenceServer>();
            *infer_state.0.lock().unwrap() = Some(child_infer);

            let (mut _rx_embed, child_embed) = app
                .shell()
                .sidecar("llama-server")
                .expect("Failed to get sidecar")
                .args([
                    "-m",
                    "./emb_model.gguf",
                    "--port",
                    "8081",
                    "--embedding",
                    "--ctx-size",
                    "512",
                    "--ubatch-size",
                    "512",
                ])
                .spawn()
                .expect("Failed to spawn embedding server");

            let embed_state = app.state::<EmbeddingServer>();
            *embed_state.0.lock().unwrap() = Some(child_embed);

            let db_path = app
                .path()
                .resolve("database", BaseDirectory::AppData)
                .unwrap()
                .display()
                .to_string();

            tauri::async_runtime::block_on(async {
                let db = database::setup_database(&db_path).await.unwrap();
                let database_state = app.state::<Mutex<Option<Connection>>>();
                *database_state.lock().unwrap() = Some(db);
            });

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            process_image,
            database::get_top_match,
            database::embed_page,
            database::create_table_for_document
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        RunEvent::ExitRequested { .. } => {
            let infer_state = app_handle.state::<InferenceServer>();
            let mut infer_guard = infer_state.0.lock().unwrap();
            if let Some(child) = infer_guard.take() {
                let _ = child.kill();
            }

            let embed_state = app_handle.state::<EmbeddingServer>();
            let mut embed_guard = embed_state.0.lock().unwrap();
            if let Some(child) = embed_guard.take() {
                let _ = child.kill();
            }
        }
        _ => {}
    });
}
