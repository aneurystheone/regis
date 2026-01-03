# Regis PWA: Architecture & Roadmap

> **Document Status**: Living
> **Target Audience**: Human Developers & AI Agents
> **Tech Stack**: React (Vite), Firebase (Auth, Firestore, Storage, Hosting), Tailwind CSS

---

## 1. High-Level Product Roadmap

This roadmap focuses on evolving Regis from a simple utility to an intelligent productivity suite for teachers.

| Phase | Goal | Key Features | User Value | Technical Milestones | Exit Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **I. Foundation (Offline Core)** | Establish a reliable, offline-first daily driver for teachers. | • CRUD for Classes, Students, Grades<br>• Offline support (PWA)<br>• Gradebook calculation<br>• Local Avatars | Usage without internet reliance. FAST daily operations. | • Firestore Offline Persistence verified<br>• Service Worker caching assets<br>• PWA Installability | Zero critical bugs in offline mode. 95+ LightHouse Performance. |
| **II. Refinement & Intelligence** | Enhance UX and introduce AI assistance to save time. | • AI Summaries (Student Performance)<br>• Voice-to-Text Anecdotes<br>• Dark Mode<br>• Mobile-optimized Dashboard | Reduced administrative burden. "Delightful" UX. | • Gemini API integration<br>• Global App Config (Firestore)<br>• Responsive Design Overhaul | User retention > 50%. Admin can toggle AI features globally. |
| **III. Scale & Compliance** | Robustness, data security, and multi-term management. | • Data Export (PDF/Excel) improvements<br>• Historical Term archiving<br>• Advanced Security Rules | Trust in data safety. Long-term usability. | • Cloud Functions for backups (optional)<br>• Strict Firestore Security Rules coverage<br>• Optimized Bundle Size | Security Audit Pass. < 1s Time-to-Interactive on 4G. |

---

## 2. System Architecture Overview

Regis follows a **Serverless, Offline-First** architecture reliant on the Firebase ecosystem.

### Layer Diagram

| Layer | Technology | Responsibilities | Contracts |
| :--- | :--- | :--- | :--- |
| **Client (PWA)** | React, Vite, Tailwind | • UI Rendering<br>• Local Business Logic<br>• Offline Data Access | Talks to **Firebase SDK** directly. Never talks to DB directly via REST (uses SDK). |
| **State & Data** | Firestore SDK (Client) | • Real-time subscriptions<br>• Offline Persistence (IndexDB)<br>• Optimistic updates | Acts as the "Source of Truth" for the UI. Syncs with **Cloud** when online. |
| **Backend Services** | Firebase (Cloud) | • Authentication (Identity Platform)<br>• NoSQL Database (Firestore)<br>• Object Storage (Storage) | Enforces **Security Rules**. Syncs data across devices. |
| **Intelligence** | Gemini API | • Text Summarization<br>• Audio Transcription | Accessed via Client (currently) or Proxy. Stateless. |

### Key Constraints
*   **Direct DB Access**: The client reads/writes directly to Firestore using the Web SDK. There is no intermediate API server for standard CRUD.
*   **Offline First**: The app **must** function if the network layer is severed. All critical reads/writes go through the Firestore Cache first.

---

## 3. Frontend Architecture (React)

### Directory Structure & Intent
```text
src/
├── components/       # Reusable UI blocks (Atomic design principles)
│   ├── shared/       # Generic (Buttons, Inputs, Cards)
│   └── business/     # Domain-specific (StudentCard, GradeGrid)
├── services/         # API & Logic Isolation
│   ├── api.ts        # Central Firestore interaction point
│   ├── storage.ts    # File uploads
│   └── gemini.ts     # AI interactions
├── hooks/            # Reusable React logic (useAuth, useLocalStorage)
├── types/            # TypeScript Interfaces (Single source of truth for models)
└── App.tsx           # Routing & Global State initialization
```

### Core Architecture Rules
1.  **Strict separation of UI and Logic**: Components should receive data via props or hooks. avoid embedding complex Firestore queries inside UI JSX. Use `services/api.ts`.
2.  **Global vs. Local State**:
    *   **Global**: User Session (`useAuth`), Global Settings (Theme).
    *   **Server State**: Managed by Firestore Listeners (`onSnapshot`).
    *   **Local**: Form inputs, toggle states, modal visibility.
3.  **PWA Requirements**:
    *   All assets must be precached via `vite-plugin-pwa`.
    *   Images (Evidence) must be handled gracefully when offline (cache or placeholder).

---

## 4. Firebase Architecture

### Services Used
*   **Authentication**: Email/Password + Google Auth.
*   **Firestore**: Primary DB.
*   **Storage**: Evidence photos/audio.
*   **Hosting**: Static asset delivery.

### Data Model (Multi-Tenant by Design)
Structure allows row-level security where users only access *their* data.

| Component | Collection Path | Document Structure | Notes |
| :--- | :--- | :--- | :--- |
| **Global Config** | `app_config/global_ai_features` | `{ featureName: boolean }` | Read-only for users, Write for Admin. |
| **User Data** | `users/{uid}/students/{studentId}` | `{ name, orderNumber, ... }` | Subcollection ensures data isolation. |
|  | `users/{uid}/classes/{classId}` | `{ name, grade, section }` | |
|  | `users/{uid}/grades/{gradeId}` | `{ studentId, score, ... }` | |

### Security Philosophy
*   **Rules**: `allow read, write: if request.auth.uid == userId;`
*   **Validation**: Validate schema types in rules (e.g., `score is number`).
*   **Trust**: Client is **untrusted**. All logic crucial for integrity must be validated by Security Rules or Cloud Functions (future).

---

## 5. Data Flow Contracts

### Standard Operation (CRUD)
1.  **Input**: User performs action (e.g., "Add Grade").
2.  **Processing**:
    *   Component calls `services/api.ts`.
    *   `api.ts` validates types.
    *   `api.ts` calls `addDoc` or `setDoc`.
3.  **Output**: Firestore SDK updates local cache immediately (Optimistic UI).
4.  **Sync**: SDK syncs with Cloud in background.

### Error Handling Strategy
| Scenario | Behavior | Responsibility |
| :--- | :--- | :--- |
| **Offline Write** | Queue locally. Resume when online. | Firestore SDK (Automatic) |
| **Validation Error** | Reject Promise. Show toast notification. | `api.ts` -> Component UI |
| **Auth Error** | Redirect to Login. Clear Session. | `App.tsx` / `useAuth` |

---

## 6. Dev & Deployment Workflow

### Local Development
1.  `npm install`
2.  `npm run dev` (Vite Server @ localhost:5173).
3.  **Mocking**: Currently uses live Dev Firebase project. Future: Firebase Emulators.

### Deployment Flow
1.  **Build**: `npm run build` (Type check -> Vite build -> `/dist`).
2.  **Deploy**: `npx firebase deploy --only hosting` (Pushes `/dist` to CDN).
3.  **Rollback**: Use Firebase Console "Hosting" version history to one-click rollback.

### Environments
*   **Development**: Localhost connected to Firebase Project.
*   **Production**: `teacher-productivity-kit.web.app`.

---

## 7. Rules for AI Agents Working on This Codebase

### ✅ Safe to Change
*   **UI Components**: Styling (Tailwind), Layout, Iconography.
*   **Business Logic in Services**: Updating calculation formulas (e.g., averages).
*   **Types**: Adding new fields to `Student` or `Class`.

### ⚠️ Requires Human Approval
*   **Destructive Actions**: Deleting collections or bulk data operations.
*   **Security Rules**: altering `firebase.json` or `firestore.rules`.
*   **Infrastructure**: Adding new Firebase services (e.g., Analytics/Remote Config).

### 🚀 How to Add New Features
1.  **Define Type**: Add interface to `src/types/index.ts`.
2.  **Service Layer**: Add CRUD methods to `src/services/api.ts`.
3.  **UI Component**: Create atom components, then page views.
4.  **Verification**: Test **OFFLINE** behavior before marking done.

### ⛔ Critical Constraints
*   **NEVER** bypass `services/api.ts` for DB calls.
*   **NEVER** use `window.location` for navigation (Use React State/Router).
*   **NEVER** break the build (TS strict mode is ON).

---

## 8. Final Check & Constraints

### Key Assumptions
*   Mobile usage is primary (Responsive first).
*   Internet is intermittent (Offline first).

### Known Constraints
*   **Tailwind v4**: Uses modern CSS variables. Watch for tool compatibility.
*   **Browser Storage**: Limited quota for images in cache. Clean-up strategies may be needed for Audio/Images long-term.

### Open Questions
### 9. Schema Migration Strategy (Offline Compatibility)

Since Regis is offline-first and NoSQL, we cannot use traditional server-side migration scripts. We use a **Lazy Client-Side Migration (Read-Repair)** strategy.

#### Protocol
1.  **Versioning**: Critical documents (e.g., `Student`) gain a `schemaVersion` field.
2.  **Read-Time Check**: When the app reads data from Firestore (or local cache) via `api.ts`, it checks the version.
3.  **On-the-Fly Adapt**:
    *   If `doc.version` is missing or old, the client temporarily transforms the data structure to match the new Runtime Types.
    *   **Crucial**: The UI *never* sees the old structure.
4.  **Write-Back (Repair)**:
    *   The next time the user saves that document, it is written back with the *new* structure and updated `schemaVersion`.
    *   We do *not* auto-trigger write-backs on read to avoid massive bandwidth spikes or offline queue congestion.

#### Example Scenario
*   *Old Schema*: `Student { name: string }`
*   *New Schema*: `Student { firstName: string, lastName: string, version: 2 }`
*   *Logic*:
    ```typescript
    // api.ts adapter
    if (data.version < 2) {
      return {
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ').slice(1).join(' '),
        version: 2
      };
    }
    ```

### 10. Admin & Security Strategy (Separation of Concerns)

To ensure security and keep the Teacher experience lightweight, we enforce a strict separation between Admin and User interfaces.

#### Architecture
1.  **Auth (Custom Claims)**: We do *not* rely on client-side checks (e.g., `email === 'admin@gmail.com'`). Instead, we use Firebase Authentication Custom Claims (`token.admin === true`).
2.  **Code Splitting**: Admin pages/components must be **Lazy Loaded** (`React.lazy`). This ensures teachers never download the Admin JS bundle, keeping the core PWA swift.
3.  **Strict Security Rules**:
    *   **Admin Data**: Write access restricted to tokens with the admin claim.
    *   **User Data**: Strict privacy. Admins cannot read User data unless explicitly granted (Privacy First).

#### Implementation Example (Firestore Rules)
```javascript
// Access to Global Config
match /app_config/{docId} {
  allow read: if true; // Everyone needs to know if AI is on
  allow write: if request.auth.token.admin == true; // Only Super Admin
}
```

### Open Questions
*   *Legacy Data*: Do we need a script to archive old terms automatically?
