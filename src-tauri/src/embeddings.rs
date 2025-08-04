use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct EmbeddingRequest<'a> {
    input: &'a str,
    model: &'a str,
}

#[derive(Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

pub async fn get_embeddings(
    http_client: &Client,
    api_key: &str,
    text: &str,
) -> anyhow::Result<Vec<f32>> {
    let request_body = EmbeddingRequest {
        input: text,
        model: "emb_model.gguf",
    };

    // 3. Build the request, set headers, add the JSON body, and send.
    let res = http_client
        .post("http://localhost:8081/v1/embeddings")
        .bearer_auth(api_key)
        .json(&request_body)
        .send()
        .await?;

    // 4. Check for errors and parse the JSON response.
    if !res.status().is_success() {
        let error_body = res.text().await?;
        anyhow::bail!("OpenAI API request failed: {}", error_body);
    }

    let mut response_data: EmbeddingResponse = res.json().await?;
    // println!("Got Response!");
    // 5. Extract the embedding vector from the parsed response.
    let embedding = response_data.data.remove(0).embedding;
    // println!("{:?}", embedding);
    Ok(embedding)
}
