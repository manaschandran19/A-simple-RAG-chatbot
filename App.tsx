import React, { useState, useCallback } from 'react';
import { FileDocument, TextChunk, ChatMessage, ProcessingState } from './types';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';
import { parseFile, chunkText } from './utils/fileParser';
import { embedChunks, retrieveContext, generateRAGResponse } from './services/geminiService';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<FileDocument[]>([]);
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle File Upload and Processing
  const handleFilesSelected = useCallback(async (files: File[]) => {
    setProcessingState(ProcessingState.PARSING);
    setErrorMsg(null);

    const newDocs: FileDocument[] = [];
    const newChunks: TextChunk[] = [];
    const processedFileNames: string[] = [];

    try {
      for (const file of files) {
        processedFileNames.push(file.name);

        // Versioning Logic: Check if doc exists
        const existingDoc = documents.find(d => d.name === file.name);
        const version = existingDoc ? existingDoc.version + 1 : 1;

        // 1. Create Document Entry
        const docId = Math.random().toString(36).substring(7);
        const docEntry: FileDocument = {
          id: docId,
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
          content: '',
          status: 'processing',
          version: version,
          timestamp: Date.now()
        };
        
        // Optimistic UI update: Remove old doc visual, add new one
        setDocuments(prev => {
          const filtered = prev.filter(d => d.name !== file.name);
          return [...filtered, docEntry];
        });
        
        newDocs.push(docEntry);

        // 2. Parse Text
        const text = await parseFile(file);
        
        // Update doc content in state
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, content: text } : d));

        // 3. Chunk Text
        const fileChunks = chunkText(text, docId, file.name);
        newChunks.push(...fileChunks);
      }

      setProcessingState(ProcessingState.EMBEDDING);
      
      // 4. Generate Embeddings (with simple batching inside the service)
      const embeddedChunks = await embedChunks(newChunks);
      
      // 5. Update State with Version Control enforcement
      
      // Update Chunks: Remove ANY chunk that belongs to the filenames we just processed (Old Versions)
      // Then add the new chunks (New Version)
      setChunks(prev => {
        const cleanChunks = prev.filter(c => !processedFileNames.includes(c.documentName));
        return [...cleanChunks, ...embeddedChunks];
      });

      // Mark documents as ready
      setDocuments(prev => prev.map(d => newDocs.find(nd => nd.id === d.id) ? { ...d, status: 'ready' } : d));
      
      setProcessingState(ProcessingState.READY);

    } catch (err) {
      console.error("Pipeline Error:", err);
      setErrorMsg("Failed to process some documents. Please try again.");
      setProcessingState(ProcessingState.IDLE);
      // Revert stuck docs if they are still in processing
      setDocuments(prev => prev.filter(d => d.status === 'ready' || d.status === 'error'));
    }
  }, [documents]); // Depend on documents to correctly calculate next version

  // Handle User Chat
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      // 1. Retrieve Context
      // If no docs, simple chat, but prompted to strictly say no info found if needing external info
      const relevantContext = await retrieveContext(text, chunks);
      
      // 2. Generate Response
      const responseText = await generateRAGResponse(text, relevantContext);

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
        sources: relevantContext // Attach sources for citation UI
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I apologize, but I encountered an error generating a response. Please check your API key or connection.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar / Knowledge Base */}
      <aside className="w-80 bg-slate-100 border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
               G
             </div>
             <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gemini RAG</h1>
          </div>
          <p className="text-xs text-gray-500 pl-1">Grounded Generation</p>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <FileUpload 
              onFilesSelected={handleFilesSelected} 
              processingState={processingState}
            />
          </div>
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
              {errorMsg}
            </div>
          )}

          <DocumentList documents={documents} />
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-slate-50">
          <div className="text-xs text-gray-400 text-center">
             Using gemini-3-pro-preview
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="md:hidden p-4 bg-white border-b border-gray-200 flex items-center justify-between">
           <h1 className="font-bold text-gray-800">Gemini RAG</h1>
           <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{documents.length} Docs</span>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-hidden">
          <div className="max-w-4xl mx-auto h-full">
            <ChatInterface 
              messages={messages} 
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
            />
          </div>
        </div>
        
        {/* Mobile File Upload Trigger could go here, but omitted for cleaner layout in this demo */}
      </main>
    </div>
  );
};

export default App;