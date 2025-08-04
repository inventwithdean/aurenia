import { invoke } from "@tauri-apps/api/core";

export async function recognizeText(base64Image) {
  try {
    const result = await invoke("process_image", { base64Image });
    return result;
  } catch (err) {
    console.error(err);
  }
}
