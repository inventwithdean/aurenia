<div align="center">
  <img src="https://github.com/user-attachments/assets/53e32f9a-d4e5-446b-817a-044644b0c196" alt="Aurenia Logo" width="120px" />
  <h1>Aurenia</h1>
  <p><strong>Offline, multilingual, beautifully yours.</strong></p>
</div>

<div align="center">
  <a href="https://github.com/inventwithdean/aurenia/releases/latest"><img src="https://img.shields.io/github/v/release/inventwithdean/aurenia?style=for-the-badge" alt="Latest Release"></a>
  <a href="https://github.com/inventwithdean/aurenia/blob/main/LICENSE"><img src="https://img.shields.io/github/license/inventwithdean/aurenia?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/inventwithdean/aurenia/stargazers"><img src="https://img.shields.io/github/stars/inventwithdean/aurenia?style=for-the-badge" alt="Stars"></a>
</div>

---

> Aurenia is a blazing fast native desktop study assistant supporting top 25 global languages natively with features like OCR and RAG, that runs completely offline.

<br>

<div align="center">
  <img src="https://github.com/user-attachments/assets/924a75d6-4c34-43ab-be3b-47590e1a5fef" alt="Aurenia Demo">
</div>

## The Vision

In a world where AI is becoming synonymous with the cloud, Aurenia challenges the trade-off between intelligence and privacy. It brings a powerful AI tutor to your desktop that runs entirely on your machine, ensuring your data is always secure.

## Key Features

* **🧠 Intelligent RAG Chat:** Ask complex questions about your documents. Aurenia's custom, multi-step RAG pipeline finds the precise information you need.
* **🌐 Truly Multilingual:** Have conversations, get translations, and generate summaries in your native tongue, with support for top 25 global languages.
* **📝 Interactive Study Tools:** Go beyond passive reading. Instantly generate interactive multiple-choice quizzes from any page to test your understanding.
* **🔒 100% Local & Private:** All AI processing happens on your device. Your documents and chats never leave your computer. No internet connection required.
* **👀 OCR for All Documents:** A built-in OCR engine automatically makes scanned documents and images fully searchable and interactive.
* **✅ No External Dependencies:** Everything comes packaged in the app. Just install, add the models, and you're ready to go.
* **💻 Minimal System Requirements:** Runs efficiently on as little as 8GB of RAM without a dedicated graphics card, and utilizes CUDA when available.

## Tech Stack

Aurenia is built with a modern, performance-focused stack:

| Component | Technology |
| :--- | :--- |
| **Application Framework** | [`Tauri`](https://v2.tauri.app/) (Rust + JS) |
| **AI Inference Engine** | [`llama.cpp`](https://github.com/ggml-org/llama.cpp) |
| **LLM Model** | Google's [`Gemma 3n`](https://huggingface.co/google/gemma-3n-E4B-it/tree/main) |
| **Embedding Model** | [`multilingual-e5-large`](https://huggingface.co/intfloat/multilingual-e5-large) |
| **Vector Database** | [`LanceDB`](https://github.com/lancedb/lancedb) |
| **OCR** | PaddleOCR (via [`paddle-ocr-rs`](https://github.com/mg-chao/paddle-ocr-rs)) |
| **PDF Handling** | [`pdf.js`](https://github.com/mozilla/pdf.js) |

## Installation & Usage

Getting started with Aurenia is easy:

1.  **Download the Installer:** Go to the [**Latest Release**](https://github.com/inventwithdean/aurenia/releases/latest) page and download the `.msi` file for Windows.
2.  **Download the Models (Prefer Quantized):** You need two model files to run Aurenia.
    * Download the LLM: [Gemma 3n GGUF](https://huggingface.co/unsloth/gemma-3n-E4B-it-GGUF)
    * Download the Embedding Model: [`multilingual-e5-large` GGUF](https://huggingface.co/phate334/multilingual-e5-large-gguf)
3.  **Place Models in Directory:** After installing Aurenia, place the two `.gguf` files you downloaded into the application's installation directory.
4.  Rename the `Gemma-3n`'s gguf to `model.gguf` and `multilingual-e5-large`'s gguf to `emb_model.gguf`
5.  **Launch Aurenia:** That's it! You can now open any PDF and start studying.

## Find Out More

* **▶️ Watch the Full Video Demo:** [https://youtu.be/doVjMl41yZY]
* **📄 Read the Technical Blog Post:** [https://inventwithdean.github.io/blog/aurenia/]

## License

This project is licensed under the Apache 2.0 - see the `LICENSE` file for details.

## Acknowledgements

This project would not be possible without the incredible open-source communities behind `llama.cpp`, `Tauri`, `LanceDB`, `pdfjs`, `PaddleOCR`, `intfloat/multilingual-e5-large` and the researchers at Google who developed and open-sourced the Gemma-3n models.
