import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface RegisCacheDB extends DBSchema {
    local_cache: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'regis-store-db';
const STORE_NAME = 'local_cache';

let dbPromise: Promise<IDBPDatabase<RegisCacheDB>> | null = null;

const getDB = () => {
    if (typeof window === 'undefined' || !window.indexedDB) return null;
    if (!dbPromise) {
        dbPromise = openDB<RegisCacheDB>(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
};

// --- In-Memory Synchronous Cache ---
// This allows api.ts to remain completely synchronous for reads
const memoryCache: Record<string, any[]> = {};

export const hydrateCacheFromIDB = async (): Promise<void> => {
    try {
        const db = await getDB();
        if (!db) return;

        // 1. Migrate existing localStorage data to IDB if present
        let migratedCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('regis_store_')) {
                try {
                    const rawData = localStorage.getItem(key);
                    if (rawData) {
                        const data = JSON.parse(rawData);
                        await db.put(STORE_NAME, data, key);
                        migratedCount++;
                    }
                    localStorage.removeItem(key); // Cleanup after migration
                    i--; // Adjust index since we removed an item
                } catch (e) {
                    console.error(`Error migrating ${key} from localStorage:`, e);
                }
            }
        }
        if (migratedCount > 0) {
            console.log(`Migrated ${migratedCount} stores from localStorage to IndexedDB`);
        }

        // 2. Load from IDB to Memory
        const keys = await db.getAllKeys(STORE_NAME);
        const values = await db.getAll(STORE_NAME);
        keys.forEach((key, index) => {
            memoryCache[key as string] = values[index];
        });
        console.log("Memory cache hydrated from IndexedDB:", keys.length, "stores");
    } catch (e) {
        console.error("Error hydrating memory cache from IDB:", e);
    }
};

export const getLocalCacheSync = <T>(key: string): T[] => {
    const data = memoryCache[`regis_store_${key}`];
    if (!data) return [];
    return Array.isArray(data) ? data : [];
};

export const setLocalCacheSync = (key: string, data: any): void => {
    const fullKey = `regis_store_${key}`;
    memoryCache[fullKey] = data;
    
    // Asynchronously flush to IndexedDB
    const dbPromiseLocal = getDB();
    if (dbPromiseLocal) {
        dbPromiseLocal.then(db => {
            db.put(STORE_NAME, data, fullKey).catch(e => {
                console.error(`Error writing ${key} to IDB cache:`, e);
            });
        }).catch(e => console.error("Failed to get DB for writing:", e));
    }
};

export const clearLocalCache = async (key: string): Promise<void> => {
    const fullKey = `regis_store_${key}`;
    delete memoryCache[fullKey];
    try {
        const db = await getDB();
        if (db) {
            await db.delete(STORE_NAME, fullKey);
        }
    } catch (e) {
        console.error(`Error deleting ${key} from IDB cache:`, e);
    }
};

export const clearAllLocalCache = async (): Promise<void> => {
    // 1. Clear memory cache
    Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
    
    // 2. Clear IndexedDB store
    try {
        const db = await getDB();
        if (db) {
            await db.clear(STORE_NAME);
        }
    } catch (e) {
        console.error("Error clearing all local cache from IDB:", e);
    }
};

