
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface RegisOfflineDB extends DBSchema {
    offline_files: {
        key: string;
        value: {
            id: string;
            blob: Blob;
            timestamp: number;
        };
    };
}

const DB_NAME = 'regis-offline-media';
const STORE_NAME = 'offline_files';

let dbPromise: Promise<IDBPDatabase<RegisOfflineDB>> | null = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<RegisOfflineDB>(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
};

export const saveOfflineFile = async (blob: Blob): Promise<string> => {
    const db = await getDB();
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.put(STORE_NAME, {
        id,
        blob,
        timestamp: Date.now(),
    });
    return `offline:${id}`;
};

export const getOfflineFile = async (id: string): Promise<Blob | undefined> => {
    const db = await getDB();
    // id format usually 'offline:...' so we might need to strip prefix if passed with it, 
    // but let's assume the caller handles the prefix or pass distinct ID.
    // Actually, let's standarize: if it starts with 'offline:', strip it.
    const lookupId = id.startsWith('offline:') ? id.split(':')[1] : id;
    const record = await db.get(STORE_NAME, lookupId);
    return record?.blob;
};

export const deleteOfflineFile = async (id: string): Promise<void> => {
    const db = await getDB();
    const lookupId = id.startsWith('offline:') ? id.split(':')[1] : id;
    await db.delete(STORE_NAME, lookupId);
};

export const getAllOfflineFiles = async (): Promise<{ id: string; blob: Blob }[]> => {
    const db = await getDB();
    const records = await db.getAll(STORE_NAME);
    return records.map(r => ({ id: `offline:${r.id}`, blob: r.blob })); // Return with prefix for consistency
};

/**
 * Helper to convert an offline: URL to a displayable blob URL
 * Use this when rendering images/audio in the UI
 */
export const getOfflineFileAsBlobURL = async (url: string): Promise<string | null> => {
    if (!url.startsWith('offline:')) return url; // Not an offline URL, return as-is

    try {
        const blob = await getOfflineFile(url);
        if (!blob) return null;
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error creating blob URL for offline file:', error);
        return null;
    }
};
