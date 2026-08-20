# Offline Synchronization Strategy

## Core Principles
1. **Optimistic UI**: All user actions are reflected immediately in the local state (`localStorage`) and notified via `notifyLocalChange`.
2. **Background Sync**: Firestore writes happen in the background. If the user is offline, the Firebase SDK queues the writes; however, our `api.ts` adds an extra layer of explicit retry logic for critical operations.
3. **Resilience Layer**: Exponential backoff retries (3 attempts: 1s, 2s, 4s) for transient Firestore errors (e.g., `unavailable`).
4. **Standardized Error Handling**: All write operations are wrapped in `handleWriteError`, which manages UI notifications (`syncEvents`) and remote logging.

## Data Model Enhancements
- All syncable entities now inherit from `BaseEntity`.
- **`updatedAt`**: ISO String timestamp added to every write. Used for deterministic "Last-Write-Wins" resolution.
- **`schemaVersion`**: Injected into every document to handle future migrations.

## Resilience Mechanism: `handleWriteError` & `withRetry`
Implemented in `services/api.ts`, this dual-layer strategy ensures:
- **`withRetry`**: Exponential backoff for network-related failures.
- **`handleWriteError`**: 
  - Instant failure UI notifications on security/permission errors.
  - Remote telemetry logging to `system_logs` for all write failures.
  - Contextual error tagging for easier debugging.

## Conflict Handling & Structural Integrity
- **Subcollections migration**: The `grades` model has been migrated from bulk documents to student-indexed subcollections, eliminating the "Last-Write-Wins" overwrite bug.
- **Merge Strategies**: All `setDoc` operations now consider whether a merge is appropriate, though subcollections largely render this moot for individual records.

## Media Synchronization (Anecdotes)
- **Offline Blobs**: Photos and Audio recorded offline are stored temporarily in IndexedDB/LocalStorage with `offline:` URI schemes.
- **Auto-Upload**: The `processPendingFileUploads` routine listens for network restoration (`online` event) to:
  1. Retrieve the blob.
  2. Upload to Firebase Storage.
  3. Update the Firestore document with the permanent public URL.
  4. Clean up local blobs.


## UI Feedback: `SyncStatusIndicator`
Integrated into the application header to provide real-time status:
- `offline`: No network connection detected.
- `syncing`: Pending Firestore writes.
- `synced`: All writes successful.
- `error`: Permission denied or persistent failure (recorded in `system_logs`).

## Verification
A suite of 18 automated tests in `tests/offline-sync.test.ts` validates:
- Persistence during offline bouts.
- Successful recovery on reconnection.
- Retry logic and suppression of retries on permission errors.
- Telemetry logging verification.
- Data sanitization and integrity checks.
