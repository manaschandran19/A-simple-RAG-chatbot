import { FileDocument } from '../types';

export const parseFile = async (file: File): Promise<string> => {
  const fileType = file.name.split('.').pop()?.toLowerCase();

  try {
    switch (fileType) {
      case 'txt':
      case 'md':
      case 'json':
      case 'csv':
        return await readTextFile(file);
      case 'pdf':
        return await readPdfFile(file);
      case 'docx':
        return await readDocxFile(file);
      case 'xlsx':
      case 'xls':
        return await readExcelFile(file);
      default:
        throw new Error(`Unsupported file type: .${fileType}`);
    }
  } catch (error) {
    console.error("Error parsing file:", error);
    throw new Error(`Failed to parse ${file.name}`);
  }
};

const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const readPdfFile = async (file: File): Promise<string> => {
  if (!window.pdfjsLib) throw new Error("PDF.js not loaded");
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += `[Page ${i}] ${pageText}\n\n`;
  }
  return fullText;
};

const readDocxFile = async (file: File): Promise<string> => {
  if (!window.mammoth) throw new Error("Mammoth not loaded");
  
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const readExcelFile = async (file: File): Promise<string> => {
  if (!window.XLSX) throw new Error("SheetJS not loaded");

  const arrayBuffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
  let fullText = "";

  workbook.SheetNames.forEach((sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    const text = window.XLSX.utils.sheet_to_txt(sheet);
    fullText += `[Sheet: ${sheetName}]\n${text}\n\n`;
  });
  return fullText;
};

// Simple sliding window chunker
export const chunkText = (text: string, docId: string, docName: string, chunkSize: number = 600, overlap: number = 100): Array<any> => {
  const chunks: Array<any> = [];
  let start = 0;

  // Cleanup text to remove excessive whitespace which hurts embeddings
  const cleanText = text.replace(/\s+/g, ' ').trim();

  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    const chunkText = cleanText.slice(start, end);
    
    chunks.push({
      id: `${docId}-${chunks.length}`,
      documentId: docId,
      documentName: docName,
      text: chunkText
    });

    start += (chunkSize - overlap);
  }
  
  return chunks;
};