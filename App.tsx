import React, { useState, useCallback, useEffect } from 'react';
import { FileDocument, ChatMessage, ProcessingState, User } from './types';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';
import LoginPage from './components/LoginPage';
import { parseFile, chunkText } from './utils/fileParser';
import { embedChunks, retrieveContext, generateRAGResponse } from './services/geminiService';
import { db } from './services/db';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App State
  const [documents, setDocuments] = useState<FileDocument[]>([]);
  // Note: 'chunks' state is removed. Chunks now live in the Vector Database (IndexedDB).
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load documents on login
  useEffect(() => {
    if (currentUser) {
      loadDocuments();
    } else {
      setDocuments([]);
      setMessages([]);
    }
  }, [currentUser]);

  const loadDocuments = async () => {
    if (!currentUser) return;
    try {
      const docs = await db.getDocumentsByUser(currentUser.username);
      setDocuments(docs);
    } catch (e) {
      console.error("Failed to load documents from DB", e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Handle File Upload and Processing
  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!currentUser) return;

    setProcessingState(ProcessingState.PARSING);
    setErrorMsg(null);

    const newDocs: FileDocument[] = [];
    
    try {
      for (const file of files) {
        // Versioning: Check DB or current state for existence
        // Logic: Delete old version from DB first to ensure clean vector state
        await db.deleteDocumentsByName(currentUser.username, file.name);

        const existingDoc = documents.find(d => d.name === file.name);
        const version = existingDoc ? existingDoc.version + 1 : 1;

        // 1. Create Document Entry
        const docId = Math.random().toString(36).substring(7);
        const docEntry: FileDocument = {
          id: docId,
          ownerId: currentUser.username,
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
          content: '', // Will fill later
          status: 'processing',
          version: version,
          timestamp: Date.now()
        };
        
        // UI Update
        setDocuments(prev => {
          const filtered = prev.filter(d => d.name !== file.name);
          return [...filtered, docEntry];
        });
        
        newDocs.push(docEntry);

        // 2. Parse Text
        const text = await parseFile(file);
        
        // 3. Chunk Text
        const fileChunks = chunkText(text, docId, file.name);

        // 4. Update UI to Embedding State
        setProcessingState(ProcessingState.EMBEDDING);
        
        // 5. Generate Embeddings
        const embeddedChunks = await embedChunks(fileChunks);
        
        // 6. Store in Vector DB
        // Update Doc content before saving
        docEntry.content = text;
        docEntry.status = 'ready';
        
        await db.saveDocument(docEntry, embeddedChunks);
        
        // Update local state to reflect ready
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'ready', content: text } : d));
      }
      
      setProcessingState(ProcessingState.READY);
      // Reload full list to ensure consistency
      await loadDocuments();

    } catch (err) {
      console.error("Pipeline Error:", err);
      setErrorMsg("Failed to process some documents. Please try again.");
      setProcessingState(ProcessingState.IDLE);
      await loadDocuments(); // Revert to consistent state
    }
  }, [documents, currentUser]);

  // Handle User Chat
  const handleSendMessage = async (text: string) => {
    if (!currentUser) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      // 1. Retrieve Context from Vector DB
      const relevantContext = await retrieveContext(text, currentUser.username);
      
      // 2. Generate Response
      const responseText = await generateRAGResponse(text, relevantContext);

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
        sources: relevantContext
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I apologize, but I encountered an error generating a response.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!currentUser) return;
    await db.deleteDocument(docId);
    await loadDocuments();
  };

  // Render Login if no user
  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  // Render App
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-80 bg-slate-100 border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
               G
             </div>
             <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gemini RAG</h1>
          </div>
          <p className="text-xs text-gray-500 pl-1">Vector DB • Secure • {currentUser.username}</p>
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

          <DocumentList documents={documents} onDelete={handleDeleteDocument} />
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
           <div className="text-xs text-gray-400">gemini-3-pro-preview</div>
           <button onClick={handleLogout} className="text-xs font-semibold text-red-500 hover:text-red-700">Logout</button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative">
        <div className="md:hidden p-4 bg-white border-b border-gray-200 flex items-center justify-between">
           <h1 className="font-bold text-gray-800">Gemini RAG</h1>
           <div className="flex items-center gap-2">
             <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{documents.length} Docs</span>
             <button onClick={handleLogout} className="text-xs text-red-500">Exit</button>
           </div>
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
      </main>
    </div>
  );
};

export default App;
