# Regis PWA: Architecture & Roadmap

> **Document Status**: Living — Last updated: 2026-08-19
> **Target Audience**: Human Developers & AI Agents
> **Tech Stack**: React 18 (Vite), Firebase (Auth, Firestore, Storage, Hosting), Tailwind CSS v4, Vitest, Gemini 3 Flash, Capacitor v8 (Android), Electron (Desktop)
> **Strategic Roadmap**: See [ROADMAP_REGIS](./ROADMAP_REGIS)

---

## 1. High-Level Technical Roadmap

| Phase | Goal | Key Features | Technical State | Exit Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **I. Foundation (Offline Core)** | Establish a reliable, offline-first daily driver. | • Firestore Subcollections (Grades) ✅<br>• Offline Sync (IndexedDB) ✅<br>• Payments (Stripe) ✅<br>• Local Avatars ✅ | **STABILIZED**.<br>Subcollections migrated.<br>Offline sync tested (`offline-sync.test.ts`). | • Zero regression in offline mode.<br>• 95+ LightHouse Performance.<br>• All sync tests passing. |
| **II. Refinement & Intelligence** | Enhance UX and assist via AI. | • Onboarding Wizard ✅<br>• Mission Checklist ✅<br>• AI Summaries (Gemini 3 Flash) ✅<br>• Voice-to-Text Anecdotes ✅<br>• AI Schedule Extraction ✅<br>• AI Student Import ✅<br>• Dark Mode ✅<br>• Lazy Sync ✅ | **IN PROGRESS**.<br>Gemini 3 Flash integrated.<br>Onboarding fully implemented (SetupWizard + MissionChecklist).<br>Lazy loading optimized. | • All AI features production-ready.<br>• Responsive Design polished for mobile. |
| **III. Scale & Compliance** | Security, Data Export, and Multi-term. | • Advanced Reports (jspdf) ✅<br>• Historical Term archiving<br>• Role-Based Access (Admin) ✅<br>• Idempotent Sync & Differential Writes ✅ | **IN PROGRESS**.<br>Admin structure exists.<br>Reports engine upgraded for V2.<br>Strict Firestore Security Rules.<br>Idempotent Merge Writes. | • Security Audit Pass.<br>• Strict Firestore Rules coverage. |

---

## 2. System Architecture Overview

Regis follows a **Serverless, Offline-First** architecture reliant on the Firebase ecosystem.

### Layer Diagram

| Layer | Technology | Responsibilities | Contracts |
| :--- | :--- | :--- | :--- |
| **Client (PWA)** | React, Vite, Tailwind v4 | • UI Rendering<br>• **State-Based Routing** (No standard router)<br>• Offline Data Access<br>• **Battery-Aware Sync** (ConnectionMonitor) | Talks to **Firebase SDK** + Specialized Services. |
| **Service Layer** | TypeScript Modules | • `api.ts`: Core Sync Engine<br>• `authService.ts`: Identity & Logout Clean<br>• `localCache.ts`: RAM & IDB Persistence<br>• `geminiService.ts`: AI (Gemini 3 Flash)<br>• `gradeHelpers.ts`: Grade Calculations<br>• `curriculumService.ts`: Curriculum Data<br>• `stripe.ts`: Payments<br>• `usageService.ts`: Usage Tracking | Centralizes logic. Components call these, NEVER DB directly. |
| **State & Data** | Firestore SDK (Client) | • Real-time subscriptions (Optimized via Lazy Loading)<br>• Offline Persistence (IndexedDB)<br>• **Smart Backup** (LocalStorage Emergency Snapshot) | Acts as the "Source of Truth". Syncs with **Cloud** when online. |
| **Backend Services** | Firebase (Cloud) | • Authentication (Identity Platform)<br>• NoSQL Database (Firestore)<br>• Object Storage (Storage)<br>• Cloud Functions (Stripe webhooks) | Enforces **Security Rules**. Syncs data across devices. |

### Key Constraints
*   **Direct DB Access**: The client reads/writes directly to Firestore using the Web SDK. No intermediate API server.
*   **Offline First**: The app **must** function if the network layer is severed. All critical reads/writes go through the Firestore Cache first.
*   **Idempotent Merge Writes**: All Firestore document writes must use `{ merge: true }` to prevent accidental field overwrites.
*   **Tenant Data Isolation**: Logout explicitly purges both in-memory cache (`memoryCache`) and IndexedDB (`regis-store-db`) to prevent shared device data leaks.
*   **Mobile First UI**: Components must be touch-friendly and responsive (`MobileGradeGrid`, `MobileBottomNav`).
*   **Battery Efficiency**: Subscriptions must be lazy-loaded (e.g., Grades only for active class). Network pinging must be event-driven, not polled.

---

## 3. Frontend Architecture (React)

### Directory Structure & Intent
```text
/regis/
├── App.tsx                     # Main Controller (State-based routing, global state)
├── index.tsx                   # React entry point
├── index.css                   # Global styles (Tailwind v4)
├── types.ts                    # Contract Layer (Single source of truth for all types)
├── utils.ts                    # Shared utility functions
├── firebase.ts                 # Firebase initialization & config
│
├── components/                 # UI Layer (63 files, 4 subdirs)
│   ├── [Feature]Manager.tsx    # Smart Containers (Logic + View)
│   │   ├── AttendanceManager   # Full attendance tracking system
│   │   ├── ClassManager        # Class CRUD & management
│   │   ├── GradebookManager    # Grades, instruments, competencies
│   │   ├── StudentManager      # Student roster management
│   │   └── SettingsManager     # App preferences
│   ├── [Feature]Modal.tsx      # Edit/Action Dialogs
│   │   ├── AddStudentModal     # V2 multi-step with framer-motion
│   │   ├── StudentImportModal  # AI-powered import (Excel, PDF, Image)
│   │   ├── AddClassModal / EditClassModal  # Class CRUD
│   │   ├── ClassDetailModal    # Read-only class info view
│   │   ├── AddInstrumentModal  # ✨ 3-step wizard (Identificación, Currículo, Criterios)
│   │   ├── EditInstrumentModal # ✨ 3-step wizard (identical to Add)
│   │   ├── InstrumentDetailModal  # Read-only instrument view
│   │   ├── InstrumentsManagerModal # List & manage all instruments
│   │   ├── AddCompetencyModal / CompetenciesManagerModal  # Curriculum
│   │   ├── CopyCompetencyModal # Duplicate competencies across classes
│   │   ├── AddRecoveryGradeModal  # Pedagogical recovery scoring
│   │   ├── AddAnecdoteModal    # Anecdote entry with audio/photo
│   │   ├── GuidanceReferralModal  # School counselor referrals
│   │   ├── ExpressGradingModal # Quick batch grading
│   │   ├── GlobalSearchModal   # Universal search
│   │   ├── EditStudentModal / EditStudentBulkModal  # Student editing
│   │   ├── MoveStudentModal / MoveStudentBulkModal  # Class transfers
│   │   └── ConfirmDeleteModal  # Generic deletion confirmation
│   ├── Dashboard.tsx           # Main dashboard with stats
│   ├── CalendarView.tsx        # Academic calendar
│   ├── AgendaCard.tsx          # Interactive agenda item component
│   ├── ClassSelector.tsx       # Class picker dropdown
│   ├── LessonPlanner.tsx       # AI-assisted lesson planning
│   ├── Reports.tsx             # PDF report generation (~50KB)
│   ├── StudentProfile.tsx      # Individual student view
│   ├── TeacherProfile.tsx      # Teacher profile management
│   ├── TeamBoard.tsx           # Team visualization and management
│   ├── RecycleBin.tsx          # Soft-delete recovery
│   ├── LoginPage.tsx           # Authentication UI
│   ├── ResetPasswordPage.tsx   # Password recovery
│   ├── ProfileDropdownMenu.tsx # User avatar dropdown menu
│   ├── QRShareModal.tsx        # Class link sharing via QR code
│   ├── ErrorBoundary.tsx       # React error boundary component
│   ├── onboarding/             # New user setup (fully implemented)
│   │   ├── SetupWizard.tsx     # Phase 1: 3-step core setup (Profile, AI Schedule, Confirm)
│   │   ├── MissionChecklist.tsx # Phase 2: Gamified value-driven checklist on Dashboard
│   │   ├── OnboardingWizard.tsx # Legacy 9-step wizard (deprecated)
│   │   └── ScheduleScanner.tsx # AI schedule image extraction
│   ├── admin/                  # Admin-only views (Lazy loaded)
│   │   ├── AdminDashboard.tsx  # System overview & management (~89KB, real Firestore data)
│   │   ├── AISettings.tsx      # AI feature toggles
│   │   ├── BackupRecoveryPanel # Data recovery tools
│   │   ├── CurriculumManagement # Curriculum CRUD
│   │   └── LogViewer.tsx       # System log viewer
│   ├── shared/                 # Generic reusable atoms
│   │   └── Tooltip.tsx
│   ├── feedback/               # User feedback components (FeedbackModal)
│   ├── Mobile-specific:        # Mobile-optimized views
│   │   ├── MobileGradeGrid     # Touch-friendly grade input
│   │   ├── MobileBottomNav     # Bottom navigation bar
│   │   ├── MobileHeader        # Compact header with dynamic back nav
│   │   └── FastAttendance      # Quick attendance marking
│   ├── Audio/Offline:          # Media handling components
│   │   ├── AudioRecorder       # Audio capture
│   │   ├── AudioVisualizer     # Audio waveform display
│   │   ├── OfflineAudio        # Offline audio playback
│   │   └── OfflineImage        # Offline image display
│   ├── Subscription:           # Premium features
│   │   ├── SubscriptionManager # Plan management
│   │   ├── PricingPlans        # Plan display
│   │   ├── PricingCard         # Individual plan card
│   │   ├── PlanBadge           # Tier badge
│   │   └── ClassLimitWarning   # Free tier limit alert
│   └── UI Atoms:               # Shared UI elements
│       ├── Avatar, Header, Sidebar
│       ├── Toast, UpdatePrompt
│       ├── SyncStatusIndicator, VicenteSyncAlert
│       └── icons.tsx           # Custom icon library (~30KB)
│
├── services/                   # Logic Layer (10 modules + 4 co-located tests)
│   ├── api.ts                  # Central Sync Engine & Firestore CRUD (~120KB)
│   ├── api.test.ts             # API service tests
│   ├── authService.ts          # Firebase Auth wrappers
│   ├── authService.test.ts     # Auth service tests
│   ├── geminiService.ts        # AI Integration (Gemini 3 Flash)
│   │   ├── generateStudentSummary
│   │   ├── generateEvaluationCriteria
│   │   ├── transcribeAndAnalyzeAnecdote
│   │   ├── generateLessonPlan
│   │   ├── extractStudentsFromImage
│   │   ├── extractStudentsFromDoc
│   │   └── extractScheduleFromImage
│   ├── gradeHelpers.ts         # Grade calculation engine (Primary + Secondary)
│   ├── gradeHelpers.test.ts    # Grade calculation tests
│   ├── curriculumService.ts    # Curriculum data loading & mapping
│   ├── curriculumService.test.ts # Curriculum service tests
│   ├── offlineStorage.ts       # IndexedDB local file handling
│   ├── storageService.ts       # Firebase Storage wrappers
│   ├── dataBackup.ts           # Emergency backup/restore system
│   ├── stripe.ts               # Stripe payment integration
│   ├── usageService.ts         # Usage tracking & free tier limits
│   ├── usageService.test.ts    # Usage service tests
│   └── mockData.ts             # Development mock data
│
├── hooks/                      # Custom React Hooks (4)
│   ├── useAdmin.ts             # Admin role detection
│   ├── useGradeSyncStatus.ts   # Real-time sync status
│   ├── usePWAInstall.ts        # PWA install prompt management
│   └── useRemoteConfig.ts      # Firebase Remote Config
│
├── contexts/                   # React Contexts (1)
│   └── SubscriptionContext.tsx  # Global subscription state
│
├── config/                     # App Configuration (3)
│   ├── limits.ts               # Free tier limits & thresholds
│   ├── phases.ts               # Feature flags & rollout phases
│   └── pricing.ts              # Pricing plan definitions
│
├── pages/                      # Page-level components
│   └── public/                 # Public (unauthenticated) pages
│       ├── LandingPage.tsx     # Marketing landing page
│       ├── PrivacyPolicy.tsx   # Privacy policy page
│       └── TermsPage.tsx       # Terms of service page
│
├── tests/                      # Integration / Component test suites (7 files)
│   ├── offline-sync.test.ts    # Critical offline resilience tests
│   ├── GradebookManager.test.tsx  # Gradebook UI & grading tests
│   ├── ClassManager.test.tsx   # Class management tests
│   ├── AttendanceManager.test.tsx # Attendance tracking tests
│   ├── StudentManager.test.tsx # Student roster tests
│   ├── Dashboard.test.tsx      # Dashboard rendering tests
│   └── Reports.test.tsx        # PDF generation tests
│
├── scripts/                    # Operational scripts (8)
│   ├── feedback-manager.ts     # Feedback triage & task generation (Admin SDK)
│   ├── migrate-to-subcollections.ts  # Grade migration tool
│   ├── verify-migration.ts     # Migration verification
│   ├── grandfather-users.ts    # Legacy user grandfathering
│   ├── update-version.ts       # Version bump automation
│   ├── lighthouse-audit.ps1    # Performance audit
│   └── generate-notebook-context.js # AI context generator
│
├── functions/                  # Firebase Cloud Functions
│   └── src/                    # Stripe webhook handlers
│
├── public/                     # Static Assets
│   ├── data/                   # Curriculum data (nested by level)
│   │   ├── index.json          # Curriculum index/registry
│   │   ├── curriculum_template_master.json  # Template schema
│   │   └── nivel_secundario/   # Secondary-level curriculum files
│   ├── logo.png, pwa-*.png     # App icons
│   └── dashboard-preview.png   # Marketing asset
│
├── docs/                       # Documentation (18 files + generated/)
│
├── src/                        # Source setup & test infrastructure
│   ├── setupTests.ts           # Test environment setup
│   ├── smoke.test.ts           # Basic smoke test
│   └── vite-env.d.ts           # Vite type declarations
│
└── Config Files:
    ├── firebase.json / .firebaserc  # Firebase config
    ├── firestore.rules              # Security rules
    ├── storage.rules                # Storage security rules
    ├── vite.config.ts               # Build config (PWA plugin)
    ├── tsconfig.json                # TypeScript config
    ├── tailwind.config.js           # Tailwind v4 config
    └── .env.*                       # Environment variables
```

### Core Architecture Rules
1.  **Manager Pattern**: Major features (Gradebook, Attendance, Students) use a "Manager" component as the main entry point to handle local state and fetching.
2.  **Resilience First**: All Firestore writes MUST pass through `api.ts` → `handleWriteError` wrapper.
3.  **Strict separation**: Components receive data via listeners/hooks from `services/api.ts`.
4.  **Custom Routing**: The app uses `App.tsx` state (`currentView`) for navigation, not React Router. Views are defined in `types.ts` as the `View` union type.
5.  **Educational Levels**: The system dynamically adjusts logic (e.g., Competency Grouping PC1-PC4 vs GP1-GP3) based on `Class.level` (Primary vs Secondary).
6.  **AI Persona**: All AI features use "Vicente", a warm Dominican teaching assistant persona powered by Gemini 3 Flash.
7.  **Curriculum Mapping**: Supports official curriculums (JSON) and generic wildcard competencies (e.g., PC1-custom). Unmapped instruments fallback to a 'Sin Grupo' representation.
8.  **Wizard Pattern**: Complex Modals (AddInstrument, EditInstrument) use a multi-step wizard with inline stepper, slide animations, and no `<form>` wrapper (prevents implicit submit bugs). Dates display as `dd/mm/yyyy`.
9.  **GradebookManager Toolbar** (tablet/PC): Controls are ordered: **Periodo → Competencias (flexible) → Recuperación (RP) → Más opciones (⋮)**.
10. **Lazy Subscriptions**: Non-critical data (Attendance, DailyNotes, Anecdotes) is lazy-loaded only when the corresponding view is active. Grades are loaded per-class on demand.
11. **Onboarding Architecture**: Two-phase onboarding: `SetupWizard` (blocking, first login) → `MissionChecklist` (persistent on Dashboard until all missions complete). Missions dispatch to real app modules, never to separate onboarding forms.
12. **Tenant Isolation (Multi-Tenant by Design)**: Teacher profile is annotated with a deterministic `schoolId` derived from regional, district, and school information to serve as a Tenant ID.
13. **Native Dialogs Avoidance**: Do NOT use blocking browser dialogs (`window.alert`, `window.confirm`, `window.prompt`). Use customized asynchronous React hooks/modals (`useConfirm`, `FeedbackModal`) to prevent interference from browser extensions (e.g., React Developer Tools, CORS blockers) and maintain UI consistency.

---

## 4. Firebase Architecture

### Services Used
*   **Authentication**: Email/Password + Google Auth.
*   **Firestore**: Primary DB.
*   **Storage**: Evidence photos/audio for anecdotes.
*   **Hosting**: Static asset delivery (Targets: `beta`, `pro`).
*   **Cloud Functions**: Stripe webhook handlers.
*   **Emulators**: Local dev environment (Firestore, Auth, Functions).

### Data Model (Multi-Tenant by Design)
Structure uses **Subcollections** for scalability.

| Component | Collection Path | Document Structure | Notes |
| :--- | :--- | :--- | :--- |
| **Global Config** | `app_config/global_ai_features` | `{ featureName: boolean }` | Read-only for users. |
| **Curriculum** | `curriculums/{id}` | `{ contents: [...], competenciesSummary: [...] }` | Supports 3D content & evaluation groups. |
| **User Data** | `users/{uid}/students/{studentId}` | `{ name, firstName, lastName, orderNumber, ... }` | Core entity. |
|  | `users/{uid}/classes/{classId}` | `{ name, grade, section, level, color }` | Subject-specific classes. |
|  | `users/{uid}/school_groups/{groupId}` | `{ name, grade, section }` | Shared student groups. |
| **Teacher Profile** | `teacher_profile/{uid}` | `{ name, email, phone, specialization, experienceYears, regional, district, schoolName, schoolCode, schoolId }` | User profile metadata. `schoolId` acts as a Tenant ID. |
| **Grades** | `instruments/{instId}/grades/{studentId}` | `{ score, criteriaScores }` | **Subcollection**. Critical for querying. |
| **Attendance** | `users/{uid}/attendance/{date}_{classId}` | `{ records: [...] }` | Batch storage per class/day. |
| **Anecdotes** | `users/{uid}/anecdotes/{id}` | `{ note, category, photoUrl, audioUrl }` | With offline file support. |
| **Subscriptions**| `users/{uid}/subscriptions/{subId}` | `{ tier, status, expiresAt, source }` | Syncs with Stripe. |
| **Recovery Grades** | `users/{uid}/recovery_grades/{id}` | `{ studentId, period, competencyGroup, score }` | Pedagogical recovery scores. |
| **Academic Summaries** | `users/{uid}/academic_summaries/{id}` | `{ periods: {P1..P4}, finalScore }` | Calculated grade register. |
| **Usage Sessions** | `usage_sessions/{userId}_{date}` | `{ date, flowsUsed, assisted }` | Batched telemetry data. |
| **Logs** | `system_logs/{logId}` | `{ error, context, timestamp }` | Remote telemetry. |

### Security Philosophy
*   **Rules**: `allow read, write: if request.auth.uid == userId;`
*   **Trust**: Client is **untrusted**.
*   **Validation**: Validate schema types in rules (e.g., `score is number`).

### Synchronization & Offline Strategy
(See [OFFLINE_STRATEGY.md](./OFFLINE_STRATEGY.md) for full details)

*   **Dual-Write Architecture**:
    *   **Local First**: All writes go immediately to `localStorage` (or IndexedDB) for optimistic UI updates.
    *   **Background Sync**: Writes are then sent to Firestore. If offline, they are queued by the SDK.
    *   **Resilience**: Critical writes use `api.ts:withRetry()` to handle transient network failures.
*   **Media Sync**:
    *   **Anecdotes**: Photos/Audio executed offline are stored locally as Blobs.
    *   **Recovery**: `processPendingFileUploads()` runs automatically when connection is restored to upload media and update URLs.
*   **Conflict Resolution & Idempotency**:
    *   **Grades**: Uses **Subcollections** (`instruments/{id}/grades/{studentId}`) to prevent overwrite conflicts.
    *   **Lists**: Uses strict `updatedAt` timestamps for Last-Write-Wins on document level.
    *   **Attendance / High-Frequency Writes**: Uses deterministic IDs (e.g., `${classId}_${studentId}_${date}`) guaranteeing true Idempotency. Actions offline across devices seamlessly merge into single logical blocks. Differential algorithms (`updateAttendancePartial`) guarantee that only modified records are submitted via `batch.set`, eliminating write amplification.

---

## 5. AI Architecture (Vicente)

All AI features are powered by **Gemini 3 Flash** (`gemini-3-flash-preview`) through the `@google/genai` SDK.

| Feature | Function | Input | Output |
| :--- | :--- | :--- | :--- |
| **Student Summary** | `generateStudentSummary` | Student + Anecdotes | Narrative summary |
| **Evaluation Criteria** | `generateEvaluationCriteria` | Competencies + Content | 6 measurable criteria |
| **Audio Transcription** | `transcribeAndAnalyzeAnecdote` | Audio base64 | Transcription + Category |
| **Lesson Planning** | `generateLessonPlan` | Grade + Subject + Topic | Objectives, Materials, Activities |
| **Student Extraction (Image)** | `extractStudentsFromImage` | Image base64 | `[{ firstName, lastName }]` |
| **Student Extraction (Doc)** | `extractStudentsFromDoc` | PDF/Excel base64 | `{ students: [...] }` |
| **Schedule Extraction** | `extractScheduleFromImage` | Image base64 | `{ courses: [{ name, grade }] }` |

All responses use structured JSON output via `responseMimeType: "application/json"` with `responseSchema`.

---

## 6. Dev & Deployment Workflow

### Local Development
1.  **Install**: `npm install`
2.  **Dev Server**: `npm run dev` (Vite @ localhost:5173).
3.  **Testing**: `npm run test` (Vitest).

### Deployment Flow
*   **Beta/Dev**: `npm run deploy:dev` (Uses `firebase.dev.json`).
*   **Production**: `npm run deploy:web:prod` (Target: `pro`).

### Environments
*   **Development**: Localhost + Firebase Dev Project (`dev` alias).
*   **Production**: `teacher-productivity-kit.web.app` (Firebase Prod Project).

---

## 7. Rules for AI Agents Working on This Codebase

### ✅ Safe to Change
*   **UI Components**: Styling (Tailwind v4), Layout.
*   **Service Logic**: Updating `api.ts` or `xxxService.ts` internals.
*   **Types**: Adding *optional* fields to `types.ts`.

### ⚠️ Requires Human Approval
*   **Destructive Actions**: Deleting collections or bulk data operations.
*   **Infrastructure**: Changing `firebase.json` or `firestore.rules`.
*   **Dependencies**: Adding new npm packages.
*   **Schema Changes**: Changing `types.ts` core interfaces (breaking changes).

### 🚀 How to Add New Features
1.  **Define Type**: Add interface to `types.ts`.
2.  **Service Layer**: Add CRUD methods to `services/api.ts` or specific service.
3.  **Manager Component**: Create `[Feature]Manager.tsx`.
4.  **Verification**:
    *   **MUST** Test **OFFLINE** behavior.
    *   **MUST** Add/Update tests in `tests/`.

### ⛔ Critical Constraints
*   **NEVER** bypass `services/api.ts` for DB calls.
*   **NEVER** use `window.location` for navigation (Use `App.tsx` callbacks).
*   **NEVER** break the build (TS strict mode is ON).
*   **Check Tailwind Version**: We use v4 (CSS variables). Ensure generated styles are compatible.
*   **AI Model**: Use the `GEMINI_MODEL` constant in `geminiService.ts`. Never hardcode model names elsewhere.
