import JSZip from 'jszip';

export interface ExtractedFile {
  name: string;
  content: string;
}

export async function extractZipFiles(zipFile: File): Promise<ExtractedFile[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const files: ExtractedFile[] = [];
  
  for (const [filename, file] of Object.entries(zip.files)) {
    if (!file.dir && (filename.endsWith('.csv') || filename.endsWith('.CSV'))) {
      const content = await file.async('text');
      files.push({ name: filename, content });
    }
  }
  
  return files;
}

export async function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function createZipFromFiles(files: { name: string; content: string }[]): Promise<Blob> {
  const zip = new JSZip();
  
  for (const file of files) {
    zip.file(file.name, file.content);
  }
  
  return zip.generateAsync({ type: 'blob' });
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}