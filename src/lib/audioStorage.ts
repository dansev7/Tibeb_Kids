'use client';

/**
 * Parent Audio Voice Studio Storage
 * IndexedDB storage for human-recorded voice clips.
 * Provides instant in-memory Blob URL resolution so children hear their
 * family's voice with 0ms network latency.
 */

export interface VoiceRecording {
  audioPath: string; // Primary key, e.g. "/audio/en/upper_A.mp3"
  blob: Blob;
  mimeType: string;
  durationSec: number;
  recordedAt: number;
  label: string;
}

const DB_NAME = 'little_learner_voice_studio';
const DB_VERSION = 1;
const STORE_NAME = 'voice_recordings';

// In-memory cache for synchronous, zero-latency resolution
const blobUrlCache = new Map<string, string>();
const recordedKeys = new Set<string>();
let isInitialized = false;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'audioPath' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Initializes the voice storage and warms up Blob URLs in memory.
 * Call this once at app startup (e.g. inside ClientProviders).
 */
export async function initVoiceStudioStorage(): Promise<void> {
  if (typeof window === 'undefined' || isInitialized) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getAllReq = store.getAll();

    await new Promise<void>((resolve, reject) => {
      getAllReq.onsuccess = () => {
        const records: VoiceRecording[] = getAllReq.result || [];
        records.forEach((record) => {
          if (record.blob && record.audioPath) {
            try {
              const url = URL.createObjectURL(record.blob);
              blobUrlCache.set(record.audioPath, url);
              recordedKeys.add(record.audioPath);
            } catch (err) {
              console.warn('Failed to create Blob URL for', record.audioPath, err);
            }
          }
        });
        isInitialized = true;
        resolve();
      };
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  } catch (err) {
    console.warn('Voice studio storage init error:', err);
  }
}

/**
 * Synchronously resolves an audio path to a custom parent recording Blob URL if present.
 * If no custom recording exists, returns the original path.
 */
export function resolveAudioPath(audioPath?: string): string | undefined {
  if (!audioPath) return undefined;
  const customUrl = blobUrlCache.get(audioPath);
  return customUrl || audioPath;
}

/**
 * Checks whether an audioPath has a custom parent voice recording.
 */
export function hasCustomVoice(audioPath?: string): boolean {
  if (!audioPath) return false;
  return recordedKeys.has(audioPath);
}

/**
 * Returns the current total count of custom voice recordings.
 */
export function getCustomVoiceCount(): number {
  return recordedKeys.size;
}

/**
 * Returns a cloned Set of all audio paths that have custom recordings.
 */
export function getAllCustomVoiceKeys(): Set<string> {
  return new Set(recordedKeys);
}

/**
 * Saves a new voice recording to IndexedDB and updates the live Blob URL cache.
 */
export async function saveVoiceRecording(
  audioPath: string,
  blob: Blob,
  durationSec: number,
  label: string
): Promise<void> {
  if (!audioPath || !blob) return;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const record: VoiceRecording = {
    audioPath,
    blob,
    mimeType: blob.type || 'audio/webm',
    durationSec: Math.round(durationSec * 10) / 10,
    recordedAt: Date.now(),
    label,
  };

  await new Promise<void>((resolve, reject) => {
    const putReq = store.put(record);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });

  // Revoke previous blob URL if any
  const previousUrl = blobUrlCache.get(audioPath);
  if (previousUrl) {
    try {
      URL.revokeObjectURL(previousUrl);
    } catch {}
  }

  // Create and cache new object URL
  try {
    const newUrl = URL.createObjectURL(blob);
    blobUrlCache.set(audioPath, newUrl);
    recordedKeys.add(audioPath);
  } catch (err) {
    console.warn('Failed to update URL cache for', audioPath, err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('voice_recordings_changed', {
        detail: { audioPath, action: 'save' },
      })
    );
  }
}

/**
 * Deletes a voice recording from IndexedDB and revokes its Blob URL.
 */
export async function deleteVoiceRecording(audioPath: string): Promise<void> {
  if (!audioPath) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const delReq = store.delete(audioPath);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    });

    const previousUrl = blobUrlCache.get(audioPath);
    if (previousUrl) {
      try {
        URL.revokeObjectURL(previousUrl);
      } catch {}
      blobUrlCache.delete(audioPath);
    }
    recordedKeys.delete(audioPath);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('voice_recordings_changed', {
          detail: { audioPath, action: 'delete' },
        })
      );
    }
  } catch (err) {
    console.warn('Failed to delete recording:', err);
  }
}

/**
 * Retrieves a single voice recording metadata and blob from IndexedDB.
 */
export async function getVoiceRecording(audioPath: string): Promise<VoiceRecording | null> {
  if (!audioPath) return null;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return await new Promise<VoiceRecording | null>((resolve, reject) => {
      const getReq = store.get(audioPath);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves all voice recordings from IndexedDB.
 */
export async function getAllVoiceRecordings(): Promise<VoiceRecording[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return await new Promise<VoiceRecording[]>((resolve, reject) => {
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  } catch {
    return [];
  }
}
