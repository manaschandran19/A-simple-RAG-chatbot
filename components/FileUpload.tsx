import React, { useRef, useState } from 'react';
import { ProcessingState } from '../types';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  processingState: ProcessingState;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, processingState }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const isProcessing = processingState === ProcessingState.PARSING || processingState === ProcessingState.EMBEDDING;

  return (
    <div className="w-full">
      <input
        type="file"
        multiple
        ref={inputRef}
        onChange={handleChange}
        className="hidden"
        accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json"
      />
      
      <div
        onClick={isProcessing ? undefined : handleClick}
        onDragOver={isProcessing ? undefined : handleDragOver}
        onDragLeave={isProcessing ? undefined : handleDragLeave}
        onDrop={isProcessing ? undefined : handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer
          ${isProcessing ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70' : 
            isDragging 
              ? 'border-indigo-500 bg-indigo-50 scale-[1.01] shadow-lg' 
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }
        `}
      >
        <div className={`p-4 rounded-full bg-indigo-100 mb-3 ${isProcessing ? 'animate-pulse' : ''}`}>
          {isProcessing ? (
             <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          ) : (
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          {isProcessing ? "Processing Knowledge Base..." : "Upload Documents"}
        </h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mb-2">
          {isProcessing 
            ? "Extracting text and generating neural embeddings for semantic search." 
            : "Drag & drop PDF, Word, Excel, or Text files here, or click to browse."}
        </p>
        {!isProcessing && (
           <div className="flex gap-2 justify-center mt-2">
             <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">PDF</span>
             <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">DOCX</span>
             <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">XLSX</span>
             <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">TXT</span>
           </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;