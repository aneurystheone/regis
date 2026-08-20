/**
 * Emergency Data Backup System (DEPRECATED)
 * 
 * Purpose: This system used to create localStorage snapshots, but was deprecated
 * because it caused QuotaExceededError crashes and the main cache was migrated to IndexedDB.
 * 
 * The functions remain as no-ops to prevent breaking imports, and the enable function
 * actively CLEANS UP any legacy backup keys left in localStorage.
 */

export interface BackupSnapshot {
    timestamp: string;
    userId: string;
    data: Record<string, any>;
    metadata: {
        deviceInfo: string;
        online: boolean;
        version: string;
    };
}

export function enableEmergencyBackup(userId: string): void {
    console.log('🧹 Emergency backup system deprecated. Cleaning up legacy backups...');
    try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('regis_emergency_backup_')) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
        if (keysToDelete.length > 0) {
            console.log(`✅ Cleaned up ${keysToDelete.length} legacy emergency backups.`);
        }
    } catch (e) {
        console.error('Failed to clean up legacy backups:', e);
    }
}

export function disableEmergencyBackup(): void {
    // No-op
}

export function clearAllBackups(): void {
    // No-op
}

export function getBackupStats() {
    return {
        totalBackups: 0,
        oldestBackup: null,
        newestBackup: null,
        totalSize: 0
    };
}

export function getAllBackups(userId: string): BackupSnapshot[] {
    return [];
}

export async function createSnapshot(userId: string): Promise<BackupSnapshot> {
    return {
        timestamp: new Date().toISOString(),
        userId,
        data: {},
        metadata: { deviceInfo: '', online: false, version: '' }
    };
}

export function saveSnapshot(snapshot: BackupSnapshot): void {}
