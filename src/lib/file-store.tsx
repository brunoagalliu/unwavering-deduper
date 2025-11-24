const DB_NAME = 'DedupeFiles';
const STORE_NAME = 'files';

interface StoredFileData {
  name: string;
  type: string;
  size: number;
  content: ArrayBuffer;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

export async function storeFiles(files: File[]): Promise<void> {
  const db = await openDB();
  
  // Convert files to array buffers first (outside transaction)
  const fileDataArray = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      content: await file.arrayBuffer()
    }))
  );

  // Now store them in a single transaction
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Clear old files first
    store.clear();

    // Add all files
    fileDataArray.forEach((fileData) => {
      store.put(fileData);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getStoredFiles(): Promise<File[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const fileDataArray = request.result as StoredFileData[];
      const files = fileDataArray.map((data) => {
        return new File([data.content], data.name, { type: data.type });
      });
      resolve(files);
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function clearStoredFiles(): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}