# Gemini Grounded RAG (Client-Side)

A secure, serverless **Retrieval-Augmented Generation (RAG)** application built with React, TypeScript, and the Google GenAI SDK. 

This application runs **entirely in the browser**, using IndexedDB as a local Vector Database. It allows users to upload private documents and chat with them using **Gemini 3 Pro**, guaranteeing that answers are grounded strictly in the provided content.

---

## 🏗 Architecture

Unlike traditional RAG applications that rely on Python backends (LangChain/LlamaIndex) and external Vector Databases (Pinecone/Chroma), this application is a self-contained "AI Vault" running inside your web browser.


graph TD
    subgraph Browser ["Browser Sandbox (Client-Side)"]
        UI[React UI]
        
        subgraph Ingestion ["Ingestion Pipeline"]
            Parser[File Parsers<br/>(PDF.js, Mammoth, XLSX)]
            Chunker[Text Chunker]
            Store[IndexedDB<br/>(Vector Store)]
        end
        
        subgraph Retrieval ["Retrieval Engine"]
            QueryProc[Query Processor]
            VectorSearch[Cosine Similarity<br/>(JavaScript Math)]
        end
        
        UI -->|File Drop| Parser
        Parser -->|Raw Text| Chunker
        Chunker -->|Chunks| API_Embed
        API_Embed -.->|Vectors| Store
        
        UI -->|User Question| QueryProc
        QueryProc -->|Query Text| API_Embed
        API_Embed -.->|Query Vector| VectorSearch
        Store -->|Load Vectors| VectorSearch
        VectorSearch -->|Top-K Context| API_Gen
    end

    subgraph GoogleAI ["Google Gemini API"]
        API_Embed[text-embedding-004]
        API_Gen[gemini-3-pro-preview]
    end

    API_Gen -->|Grounded Response| UI


---

## ✨ Key Features

### 1. Zero-Server Infrastructure
*   **Client-Side Vector DB**: Uses `IndexedDB` to store document text and 768-dimensional vectors persistently.
*   **Privacy First**: Your documents are **never** uploaded to an application server. They are processed locally and stored in your browser's isolated storage.
*   **Persistence**: Data survives page refreshes and browser restarts.

### 2. Universal Document Support
*   **PDF**: Parsed via `pdf.js` (extracts text per page).
*   **Word (.docx)**: Parsed via `mammoth` (extracts raw text).
*   **Excel (.xlsx)**: Parsed via `SheetJS` (flattens sheets to text).
*   **Text**: Native support for `.txt`, `.md`, `.csv`, `.json`.

### 3. Advanced AI Features
*   **Model**: Powered by `gemini-3-pro-preview` for high-reasoning capabilities.
*   **Embedding**: Uses `text-embedding-004` for semantic understanding.
*   **Interactive Citations**: Chat responses include clickable references (e.g., `[Benefits.pdf]`) that open the exact source snippet used to generate the answer.
*   **Strict Grounding**: System instructions force the model to answer *only* from the provided context, reducing hallucinations.

---

## 🛠 Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **AI SDK**: `@google/genai`
*   **Storage**: `idb` (IndexedDB Wrapper)
*   **Parsing**: `pdfjs-dist`, `mammoth`, `xlsx`
*   **Build**: ESBuild (implied via standard React setup)

---

## 🚀 Getting Started

### Prerequisites
You need a **Google Gemini API Key**.
1.  Get a key from [Google AI Studio](https://aistudiocdn.com).
2.  Ensure it has access to `gemini-3-pro-preview` and `text-embedding-004`.

### Installation
1.  **Clone the repository**.
2.  **Set Environment Variable**:
    The application expects the API key to be available via `process.env.API_KEY`.
    *   *Note: Since this is a client-side demo, you might typically use a `.env` file or hardcode it for local testing (do not commit keys to GitHub).*

3.  **Run the App**:
    ```bash
    npm install
    npm start
    ```

---

## 🧠 How it Works (The Logic)

### Phase 1: Ingestion
1.  User drags a PDF into the drop zone.
2.  `pdf.js` reads the binary data and extracts text strings.
3.  Text is split into chunks of 600 characters with a 100-character overlap.
4.  Chunks are sent to `ai.models.embedContent` to get vector embeddings.
5.  The text + vector pair is saved to `IndexedDB`.

### Phase 2: Retrieval (The "Search")
1.  User asks: "What is the deductible?"
2.  The question is embedded into a vector.
3.  The app fetches **all** vectors for the current user from `IndexedDB`.
4.  It calculates the **Cosine Similarity** between the question vector and every document vector (Brute force search, effective for <10k chunks).
5.  It sorts by score and picks the top 10 chunks.

### Phase 3: Generation
1.  A prompt is built:
    > "You are a helpful assistant. Answer the user question using ONLY the context below..."
    > [Context: Chunk 1...]
    > [Context: Chunk 2...]
    > User Question: "What is the deductible?"
2.  Gemini generates the answer.

---

## ⚠️ Limitations

1.  **Scale**: Performing Cosine Similarity in JavaScript on the main thread is fast for hundreds of documents, but will slow down if you upload thousands of books (Millions of tokens).
2.  **Browser Storage**: IndexedDB limits vary by browser and disk space (usually a few GBs are available).
3.  **Security**: While documents aren't sent to our server, the **Text Chunks** are sent to Google's API for embedding and generation.

---

## 🔒 Security & Auth

The app includes a simulation of "Authentication":
*   Users can "Register" and "Login".
*   This creates a logical partition in IndexedDB (`ownerId`).
*   **Note**: This is client-side auth only. If you clear your browser cache/storage, the data is lost.
