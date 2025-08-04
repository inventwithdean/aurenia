use crate::embeddings::get_embeddings;
use arrow_array::{
    builder::{FixedSizeListBuilder, Float32Builder},
    Int32Array, RecordBatch, RecordBatchIterator, StringArray,
};
use arrow_schema::{ArrowError, DataType, Field, Schema};
use futures::TryStreamExt;
use lancedb::{
    connect,
    query::{ExecutableQuery, QueryBase, Select},
    Connection, Table,
};

use reqwest::Client;
use sha2::{Digest, Sha256};
use std::sync::{Arc, Mutex};

use tauri::State;

pub async fn setup_database(path: &str) -> Result<Connection, lancedb::Error> {
    let db = connect(path).execute().await.unwrap();
    Ok(db)
}

// Hashes the bookname to be used as a table name
fn create_table_name_from_document_name(document_name: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(document_name.as_bytes());
    let hash_result = hasher.finalize();
    hex::encode(hash_result)
}

#[tauri::command]
pub async fn embed_page(
    document_name: &str,
    text: &str,
    page_num: i32,
    database_state: State<'_, Mutex<Option<Connection>>>,
) -> Result<(), String> {
    const CHUNK_SIZE: usize = 200;
    const OVERLAP: usize = 20;
    let api_key = "Nothing";
    let http_client = Client::new();
    let db = {
        let db_conn_guard = database_state.lock().unwrap();
        db_conn_guard
            .as_ref()
            .ok_or("Database not connected")
            .unwrap()
            .clone()
    };
    let table_name = create_table_name_from_document_name(document_name);
    let table = db
        .open_table(table_name)
        .execute()
        .await
        .map_err(|e| e.to_string())
        .unwrap();

    let chunks = create_text_chunks(&text, CHUNK_SIZE, OVERLAP);
    // For each chunk get embeddings
    for chunk in chunks.iter() {
        // println!("[Chunk]");
        // println!("{}", chunk);
        let emb_res = get_embeddings(&http_client, api_key, &format!("passage: {}", chunk)).await;
        match emb_res {
            Ok(emb) => {
                let _ = add_row_to_database(&table, page_num, &chunk, emb).await;
            }
            Err(_) => {}
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn create_table_for_document(
    document_name: &str,
    database_state: State<'_, Mutex<Option<Connection>>>,
) -> Result<(), String> {
    // println!("{}", document_name);

    // Create Schema for document's table
    // id is page number
    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Int32, false),
        Field::new("text", DataType::Utf8, false),
        Field::new(
            "vector",
            DataType::FixedSizeList(Arc::new(Field::new("item", DataType::Float32, false)), 1024),
            false,
        ),
    ]));
    // Adding nothing.
    let empty_batches: Vec<Result<RecordBatch, ArrowError>> = vec![];
    let reader = RecordBatchIterator::new(empty_batches.into_iter(), schema.clone());
    // Getting database from Tauri's Managed state
    let db = {
        let db_conn_guard = database_state.lock().unwrap();
        db_conn_guard
            .as_ref()
            .ok_or("Database not connected")
            .unwrap()
            .clone()
    };

    // Creating Table
    let table_name = create_table_name_from_document_name(document_name);
    let _ = db
        .create_table(table_name, Box::new(reader))
        .execute()
        .await
        .map_err(|e| e.to_string())
        .unwrap();

    Ok(())
}

async fn add_row_to_database(
    table: &Table,
    page_num: i32,
    text: &str,
    emb: Vec<f32>,
) -> Result<(), String> {
    let schema = table.schema().await.map_err(|e| e.to_string())?;
    let mut list_builder = FixedSizeListBuilder::new(Float32Builder::new(), 1024);
    list_builder.values().append_slice(&emb);
    list_builder.append(true);

    let fixed_size_list_array = list_builder.finish();
    let new_batch = RecordBatch::try_new(
        schema.clone(),
        vec![
            Arc::new(Int32Array::from(vec![page_num])), // New IDs
            Arc::new(StringArray::from(vec![text])),
            Arc::new(fixed_size_list_array),
        ],
    );
    let reader = RecordBatchIterator::new(vec![new_batch].into_iter(), schema.clone());
    table
        .add(reader)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    // println!("Added Row");
    Ok(())
}

fn create_text_chunks(text: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let total_words = words.len();
    if total_words <= chunk_size {
        return vec![text.to_string()];
    }
    let mut chunks = Vec::new();
    let step = chunk_size - overlap;
    let mut i = 0;

    while i < total_words {
        let end = std::cmp::min(i + chunk_size, total_words);
        let chunk_slice = &words[i..end];
        chunks.push(chunk_slice.join(" "));
        if end == total_words {
            break;
        }
        i += step;
    }
    chunks
}

use serde::Serialize;

#[derive(Serialize)]
pub struct TopMatchResult {
    pub text: String,
    pub page_number: i32,
}

#[tauri::command]
pub async fn get_top_match(
    document_name: &str,
    query: &str,
    database_state: State<'_, Mutex<Option<Connection>>>,
) -> Result<TopMatchResult, String> {
    let db = {
        let db_conn_guard = database_state.lock().unwrap();
        db_conn_guard
            .as_ref()
            .ok_or("Database not connected")
            .unwrap()
            .clone()
    };
    let table_name = create_table_name_from_document_name(document_name);
    let table = db
        .open_table(table_name)
        .execute()
        .await
        .map_err(|e| e.to_string())
        .unwrap();

    let api_key = "Nothing";
    let http_client = Client::new();
    let query_embedding = get_embeddings(&http_client, api_key, &format!("query: {}", query))
        .await
        .unwrap();
    let mut stream = table
        .query()
        .nearest_to(query_embedding)
        .unwrap()
        .limit(1)
        .select(Select::Columns(vec![
            String::from("id"),
            String::from("text"),
        ]))
        .execute()
        .await
        .unwrap();

    let rb = stream.try_next().await.unwrap().unwrap();

    let out_text = rb
        .column_by_name("text")
        .unwrap()
        .as_any()
        .downcast_ref::<StringArray>()
        .unwrap();
    let out_page_num = rb
        .column_by_name("id")
        .unwrap()
        .as_any()
        .downcast_ref::<Int32Array>()
        .unwrap();
    let text = out_text.iter().next().unwrap().unwrap();
    let page_num = out_page_num.iter().next().unwrap().unwrap();

    // println!("Closest match: {}", text);
    // println!("Page Number: {}", page_num);
    Ok(TopMatchResult {
        text: text.to_string(),
        page_number: page_num,
    })
}
