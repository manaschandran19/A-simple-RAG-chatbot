import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, SourceCitation } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

// Modal to display the full source content
const SourceModal: React.FC<{ source: SourceCitation; onClose: () => void }> = ({ source, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{source.documentName}</h3>
              <p className="text-xs text-gray-500">Relevance Score: {(source.relevanceScore * 100).toFixed(1)}%</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-white">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Excerpt Content</h4>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-gray-800 leading-relaxed text-sm whitespace-pre-wrap font-mono">
            {source.snippet}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  // Function to parse text and replace [filename] with clickable buttons
  const renderMessageContent = (content: string, sources?: SourceCitation[]) => {
    if (!sources || sources.length === 0) return <div className="whitespace-pre-wrap">{content}</div>;

    // Split regex: looks for [anything inside brackets]
    const parts = content.split(/(\[.*?\])/g);

    return (
      <div className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, index) => {
          const match = part.match(/^\[(.*?)\]$/);
          if (match) {
            const citationText = match[1];
            // Clean up citation text (remove "Source: " or extra spaces if present)
            const cleanCitation = citationText.replace(/^Source:\s*/i, '').trim();
            
            // Find if this citation matches any of our sources
            // We check if the source name is contained in the citation or vice versa
            const source = sources.find(s => 
              cleanCitation.includes(s.documentName) || s.documentName.includes(cleanCitation)
            );

            if (source) {
              return (
                <button
                  key={index}
                  onClick={() => setSelectedSource(source)}
                  className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-medium text-sm transition-colors border border-indigo-200 align-baseline cursor-pointer"
                  title="Click to view source context"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {cleanCitation}
                </button>
              );
            }
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      
      {/* Modal Overlay */}
      {selectedSource && (
        <SourceModal source={selectedSource} onClose={() => setSelectedSource(null)} />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-60">
             <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
             </svg>
             <p className="text-lg font-medium">No messages yet</p>
             <p className="text-sm">Upload a document and start asking questions.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                }`}
              >
                {/* Render Content with Parsed Citations */}
                {renderMessageContent(msg.content, msg.sources)}

                {/* Sources Footer Section */}
                {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                      Referenced Sources:
                    </p>
                    <div className="space-y-2">
                      {msg.sources.map((source, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedSource(source)}
                          className="group bg-gray-50 p-2 rounded border border-gray-100 text-xs cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1">
                              📄 {source.documentName} 
                            </span>
                            <span className="text-gray-400 font-normal group-hover:text-indigo-400">{(source.relevanceScore * 100).toFixed(0)}% Match</span>
                          </div>
                          <p className="text-gray-600 line-clamp-2 italic group-hover:text-gray-800">"{source.snippet}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
              <div className="flex space-x-2 items-center h-6">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 z-10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm md:text-base disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;