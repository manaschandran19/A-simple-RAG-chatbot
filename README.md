# Gemini Grounded RAG (Client-Side)

This is a secure, serverless **Retrieval-Augmented Generation (RAG)** application built with React, TypeScript, and the Google GenAI SDK. 

It allows users to upload documents (PDF, Docx, Excel, Text) and chat with them using the **Gemini 3 Pro** model. The application guarantees that answers are grounded strictly in the provided content, minimizing hallucinations.

---

## 🏗 Architecture

Unlike traditional RAG applications that require a backend (Python/Node.js) and an external Vector Database (Pinecone, Chroma), this application runs **entirely in the browser**.

### 1. In-Memory Vector Store
*   **Storage**: Document chunks and their vector embeddings are stored in the React Application State (RAM).
*   **Privacy**: Your documents are never uploaded to a third-party application server or database. They exist only in your current browser session.
*   **Search**: We perform a "Brute Force" Cosine Similarity search directly in JavaScript. Modern browsers can handle dot-product calculations for thousands of chunks with negligible latency.

### 2. The RAG Pipeline

#### Phase A: Ingestion (Indexing)
1.  **File Parsing**: Browser-based libraries (`pdf.js`, `mammoth`, `xlsx`) extract raw text from files.
2.  **Chunking**: Text is split into overlapping segments (e.g., 600 chars length, 100 overlap) to preserve context.
3.  **Embedding**: Chunks are sent to the **Gemini Embedding API** (`text-embedding-004`).
4.  **Versioning**: If a file is re-uploaded, the system detects the duplicate, increments the version number (e.g., `v2`), deletes old vectors associated with that file, and indexes the new content.

#### Phase B: Retrieval & Generation
1.  **Query Embedding**: The user's question is embedded into a vector.
2.  **Vector Search**: The system calculates the similarity between the Query Vector and all Document Chunk Vectors.
3.  **Top-K Retrieval**: The top 5 most relevant text snippets are retrieved.
4.  **Augmented Generation**: A prompt is constructed containing the System Instructions, the Retrieved Context, and the User Question.
5.  **Response**: **Gemini 3 Pro** generates an answer citing specific documents.

---

## 📂 Project Structure

### Core Logic
*   **`App.tsx`**: The main controller. It manages the application state (`documents`, `chunks`, `messages`) and orchestrates the flow between the UI and services.
*   **`services/geminiService.ts`**: The AI layer.
    *   `generateEmbedding()`: Calls `text-embedding-004`.
    *   `retrieveContext()`: Performs the math (Cosine Similarity) to find relevant chunks.
    *   `generateRAGResponse()`: Calls `gemini-3-pro-preview` with strict anti-hallucination system instructions.
*   **`utils/fileParser.ts`**: Handles extracting text from binary file formats strictly in the browser.

### Components
*   **`components/ChatInterface.tsx`**: Displays the chat history and renders citations.
*   **`components/FileUpload.tsx`**: Drag-and-drop zone handling file inputs.
*   **`components/DocumentList.tsx`**: Sidebar showing uploaded files and their version status.

---

## 🧠 Model Configuration

### Embedding Model
*   **Model**: `text-embedding-004`
*   **Dimensions**: 768 dimensions (standard for Gemini embeddings).

### Generation Model
*   **Model**: `gemini-3-pro-preview`
*   **Temperature**: `0.1` (Very low to ensure factual consistency).
*   **System Instruction**: 
    > "You are a Retrieval-Augmented Generation (RAG) assistant. You must answer the user’s question strictly and exclusively using the information contained in the Provided Context."

---

## 🚀 Getting Started

1.  **API Key**: This application requires a Google Gemini API Key.
2.  **Environment**: Ensure `process.env.API_KEY` is available in your build environment.
3.  **Dependencies**:
    *   `@google/genai`: For AI interactions.
    *   `pdfjs-dist`: For parsing PDFs.
    *   `mammoth`: For parsing Word documents.
    *   `xlsx`: For parsing Spreadsheets.
    *   `tailwindcss`: For styling.

## ⚠️ Limitations

1.  **Memory**: Since vectors are stored in RAM, uploading hundreds of massive documents may slow down the browser tab or cause a crash.
2.  **Persistence**: Refreshing the page clears the document store (by design, for security and simplicity).

