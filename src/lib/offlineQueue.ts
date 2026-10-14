'use client';

const DB_NAME = 'little_learner_offline';
const STORE_NAME = 'sync_queue';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface QueuedEvent {
  id?: number;
  url: string;
  payload: any;
  timestamp: number;
}

export async function queueOfflineProgress(url: string, payload: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item: QueuedEvent = {
      url,
      payload,
      timestamp: Date.now(),
    };
    store.add(item);
  } catch (err) {
    console.warn('Failed to queue progress offline in IndexedDB:', err);
  }
}

export async function syncOfflineQueue(): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return 0;
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const getAllRequest = store.getAll();

    return new Promise((resolve) => {
      getAllRequest.onsuccess = async () => {
        const items: QueuedEvent[] = getAllRequest.result || [];
        if (items.length === 0) return resolve(0);

        let syncedCount = 0;
        for (const item of items) {
          try {
            const res = await fetch(item.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload),
            });

            if (res.ok && item.id != null) {
              const deleteTx = db.transaction(STORE_NAME, 'readwrite');
              deleteTx.objectStore(STORE_NAME).delete(item.id);
              syncedCount++;
            }
          } catch (fetchErr) {
            console.warn('Offline item sync error, will retry later:', fetchErr);
            break;
          }
        }
        resolve(syncedCount);
      };

      getAllRequest.onerror = () => resolve(0);
    });
  } catch (err) {
    console.warn('Sync offline queue failed:', err);
    return 0;
  }
}

// Auto-sync listener on window 'online'
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineQueue();
  });
}
