# CodeAtlas

<div align="center">

**AI-powered repository intelligence platform for code analysis, documentation, and grounded project Q&A**

[Features](#features) | [Tech Stack](#tech-stack) | [Getting Started](#getting-started) | [App Routes](#app-routes) | [API Documentation](#api-documentation)

</div>

---

## Overview

CodeAtlas helps developers understand unfamiliar repositories quickly by combining static scanning, feature detection, relationship mapping, AI documentation generation, and contextual chat over the analyzed codebase.

You can ingest projects from ZIP uploads or Git URLs, then explore them through dedicated pages for **Overview**, **Insights**, **Files**, **Source**, and **Ask**.

A **Public Explorer** mode provides a read-only demo of any project without requiring authentication.

---

## Features

### Project Ingestion and Analysis

- Upload `.zip` archives (max 100MB) or import from Git URL (shallow clone).
- **MERN stack validation** — optional pre-scan to verify the project uses MongoDB, Express, React, and Node.js.
- **Upload cancellation** — cancel in-progress uploads with soft-delete cleanup.
- Automatic scanning of file metadata, routes, imports/exports, dependencies, and relationships.
- Feature grouping with categorized frontend/backend/shared ownership (25+ sub-categories).
- Tier-based classification (Tier 1 = feature-defining files, Tier 2 = structural, Tier 3 = rest).
- Persisted project statistics (frameworks, total files, feature count, relationship stats).

### AI Documentation Workflow

- Background AI documentation generation after project ingestion (gpt-4o-mini).
- **Overview-level**, **feature-level**, and **file-level** documentation.
- Live documentation progress streaming via **Server-Sent Events (SSE)**.
- Selective regeneration for project overview, a feature, or a single file.
- **Mermaid.js diagram generation** for architecture visualization.
- In-place cache update via React Query on regeneration.

### AI Assistant (Grounded Q&A)

- Ask contextual questions against indexed project chunks.
- **Intent classification** (FILE_SPECIFIC, FEATURE_OVERVIEW, ARCHITECTURE, CODE_DETAIL, GENERAL).
- **Query expansion** with structural hints for better retrieval.
- Two-pass **Atlas Vector Search** (focused + broad) with scoring and diversity reranking.
- Non-stream and SSE stream answer endpoints.
- Citations with file paths, line ranges, chunk types, and relevance scores.
- Persistent project chat history with rename, delete, and caching support.
- **Chat caching** via React Query for instant restoration of recent sessions.

### Overview Tab

- Split-pane layout: collapsible sidebar (Project Overview + Features with file trees).
- Markdown-rendered AI documentation with short summaries and detailed overviews.
- Mermaid architecture diagrams rendered client-side.
- Search tags indexed from AI output.
- Regeneration per item with real-time cache updates.
- **Auto-reset scroll** when navigating between items.

### Insights Tab

- Split-pane layout: sidebar with Project Overview and Features with file lists.
- **Project metadata pane** — project stats, frameworks detected, file types breakdown.
- **Feature details** — API routes, categorized files (by role), shared dependencies.
- **File details** — linked file analysis with method, role, category, tier badges.
- **Auto-reset scroll** when navigating between items.

### Files Tab

- File tree auto-built from flat file paths with recursive folder expansion.
- **File details** pane — type, category, role, behavior badges, API routes, dependencies.
- Import/export counts with clickable import paths for in-tab navigation.
- **Navigation history** stack with back button for import traversal.
- Selected file persists across tab switches via localStorage.
- **Auto-reset scroll** when opening a new file.

### Source Tab

- File tree + source code viewer with **syntax highlighting** (Prism / vsDark theme).
- Lazy-loaded file content (fetched on file selection).
- **AI file summary** dialog with markdown rendering.
- 128KB syntax highlight limit with plain-text fallback; 512KB display limit.
- Selected file persists across tab switches via localStorage.

### Ask Tab (Chat Interface)

- Full-height chat with SSE streaming responses and typing animation.
- **Persisted chat history** — create, rename, delete conversations.
- **Message snapshot backup** to localStorage for crash recovery.
- Auto-scroll with "jump to bottom" floating button.
- Ephemeral mode for public explorer (no persistence).
- Citations shown inline after each assistant response.
- **React Query caching** for instant chat restoration.

### Collaboration and Public Explorer

- Project sharing with verified users (owner-managed share list, max 50 users).
- Share suggestions endpoint for quick collaborator lookup (email search).
- Public Explorer endpoints for a configured showcase project ID (read-only, no auth).

### Authentication and Admin Controls

- JWT auth with HttpOnly cookies (primary), Bearer header (secondary), query param (SSE fallback).
- Email verification with 6-digit OTP (via Brevo transactional email).
- Forgot-password flow with OTP verification.
- **Account blocking** — admin can block/unblock users; blocked accounts receive a dedicated wall on login and 403 on all protected APIs.
- Admin dashboard with global stats, user management, notifications, and account deletion (cascading removes all user data).

### Security and Reliability

- Helmet security headers, CORS policy, centralized error handling.
- Rate limiting on auth/upload related endpoints (15 req / 15 min).
- Account blocking enforcement across all protected APIs.
- Graceful shutdown (SIGTERM/SIGINT) with MongoDB connection cleanup.
- Uptime self-ping for Render deployment health.

---

## Tech Stack

### Frontend

- **React 19** with React Compiler (babel-plugin-react-compiler)
- **Vite 7** with manual production chunk splitting
- **React Router DOM 7** with lazy-loaded routes
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin
- **TanStack React Query 5** — server state, caching, optimistic updates
- **Axios** — HTTP client with response interceptors for session/blocked handling
- **Radix UI** — accessible headless UI primitives (dialog, popover, scroll-area, sidebar, etc.)
- **shadcn-style component library** — custom UI primitives in `components/ui/`
- **Mermaid 11** — client-side diagram rendering
- **React Markdown + remark-gfm** — markdown rendering for docs and chat
- **react-code-block + prism-react-renderer** — syntax-highlighted source code
- **Lucide React** — consistent iconography
- **react-resizable-panels** — resizable split panes (used in Source tab)
- **cmdk** — command palette primitives
- **Geist** — typeface

### Backend

- **Node.js** with ES Modules
- **Express 5** — HTTP server
- **MongoDB + Mongoose 9** — document database
- **Multer** — ZIP file upload handling
- **adm-zip** — ZIP extraction
- **simple-git** — Git repository cloning (shallow, depth 1)
- **jsonwebtoken + bcrypt** — authentication (JWT in HttpOnly cookies, 7d expiry)
- **Brevo REST Email API** — transactional emails (verification, password reset, admin notices)
- **helmet + cors + express-rate-limit** — security hardening

### AI Layer

- **OpenAI API** — models: `gpt-4o-mini` (docs + chat), `text-embedding-3-small` (1536-dim embeddings)
- **@langchain/openai** — LangChain integration (not used for core RAG pipeline)
- Custom chunking with 6 chunk types (code, file-summary, file-docs, feature-summary, feature-docs, project-docs)
- Two-pass Atlas Vector Search with diversity reranking, tier boosting, and score gap detection
- Retry wrapper with exponential backoff (2s, 4s, 8s) for AI calls

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MongoDB instance (local or Atlas)
- OpenAI API key (required for AI docs/chat)
- Brevo API key, sender email, and sender name configured in server env

### Installation

1. Clone repository

   ```bash
   git clone <repository-url>
   cd CodeAtlas
   ```

2. Install dependencies

   ```bash
   cd client
   npm install
   cd ../server
   npm install
   ```

3. Configure environment variables

   Create `server/.env`:

   ```env
   # Core
   MONGODB_URI=mongodb://127.0.0.1:27017/codeatlas
   JWT_SECRET=your-strong-jwt-secret
   OPENAI_API_KEY=your-openai-api-key

   # Runtime
   PORT=5000
   NODE_ENV=development
   JWT_EXPIRES_IN=7d
   CORS_ORIGINS=http://localhost:5173,https://your-frontend-domain
   UPLOAD_DIR=./src/temp

   # Public Explorer
   PUBLIC_PROJECT_ID=<mongo-project-id-used-for-public-explorer>

   # Optional uptime self-ping
   SELF_PING_URL=https://your-backend-domain/health
   SELF_PING_INTERVAL_MS=600000

   # Email (Brevo REST API)
   BREVO_API_KEY=your-brevo-api-key
   BREVO_FROM_EMAIL=no-reply@your-verified-domain.com
   BREVO_FROM_NAME=CodeAtlas

   # Optional Brevo API tuning:
   # BREVO_API_BASE_URL=https://api.brevo.com
   # BREVO_EMAIL_API_URL=https://api.brevo.com/v3/smtp/email
   # BREVO_RETRY_ATTEMPTS=2
   # BREVO_RETRY_BACKOFF_MS=350
   # BREVO_REQUEST_TIMEOUT_MS=10000

   # Dev-only fallback to console logs when Brevo API delivery is unavailable
   ALLOW_EMAIL_CONSOLE_FALLBACK=false
   ```

   Create `client/.env`:

   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_PUBLIC_PROJECT_ID=<same-id-as-server-public-project-id>
   ```

4. Start development servers

   Option A: run both with root script

   ```bash
   dev.bat
   ```

   Option B: run separately

   ```bash
   # terminal 1
   cd server
   npm run dev

   # terminal 2
   cd client
   npm run dev
   ```

5. Open app

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`

### Create Admin User

```bash
cd server
npm run seed:admin
```

---

## App Routes

### Public Frontend Routes

| Route | Page |
|-------|------|
| `/` | Landing page |
| `/explore/*` | Public demo dashboard (read-only) |
| `/login` | Sign in |
| `/register` | Sign up |
| `/verify-email` | Email verification (6-digit OTP) |
| `/forgot-password` | Request password reset |
| `/reset-password` | Reset password with OTP |

### Protected Frontend Routes

| Route | Page | Access |
|-------|------|--------|
| `/dashboard` | Project list | Authenticated |
| `/upload` | ZIP/Git upload wizard | Non-admin only |
| `/admin` | Admin dashboard | Admin only |
| `/project/:id/overview` | AI documentation viewer | Owner/shared |
| `/project/:id/insights` | Project insights & stats | Owner/shared |
| `/project/:id/files` | File tree & metadata | Owner/shared |
| `/project/:id/source` | Source code viewer | Owner/shared |
| `/project/:id/ask` | AI Q&A chat | Owner/shared |

---

## API Documentation

Base URL: `http://localhost:5000/api`

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api` | API heartbeat message |
| GET | `/health` | Service health probe |

### Auth (Public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/verify-email` | Verify email with 6-digit code |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/resend-code` | Resend verification email |
| POST | `/auth/forgot-password` | Send password reset OTP |
| POST | `/auth/verify-reset-code` | Verify password reset OTP |
| POST | `/auth/reset-password` | Set new password with verified OTP |

### Auth (Protected)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Clear JWT cookie |

### Project Ingestion (Protected, Non-admin)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | ZIP upload + scan + async docs pipeline |
| POST | `/upload-git` | Git clone + scan + async docs pipeline |

### Project Management (Protected)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List owned and shared projects |
| GET | `/projects/share/suggestions?q=<email>` | Search verified users for sharing |
| GET | `/projects/:id/status` | Project status polling |
| POST | `/projects/:id/cancel` | Cancel in-progress upload |
| GET | `/projects/:id/share` | Get share settings (owner only) |
| PATCH | `/projects/:id/share` | Update shared users (owner only) |
| DELETE | `/projects/:id` | Delete project + all data (owner only) |

### Overview (Protected)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:id/overview` | Full AI documentation with features + files |
| GET | `/projects/:id/overview/progress` | SSE — doc pipeline progress stream |
| POST | `/projects/:id/overview/regenerate` | Regenerate project-level docs (owner) |
| POST | `/projects/:id/overview/regenerate/feature` | Regenerate feature-level docs (owner) |
| POST | `/projects/:id/overview/regenerate/file` | Regenerate file-level docs (owner) |

### Insights, Files, Source (Protected)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:id/insights` | Full insights page data |
| GET | `/projects/:id/files` | File list for Files page |
| GET | `/projects/:id/files/features` | Features list |
| GET | `/projects/:id/files/features/:keyword` | Feature detail with populated files |
| GET | `/projects/:id/source/files` | Lightweight file list for Source |
| GET | `/projects/:id/source/file?path=<path>` | Lazy-load file content |

### Ask / Chat (Protected)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/:id/ask` | Ask question (non-streaming response) |
| POST | `/projects/:id/ask/stream` | SSE — streaming answer with citations |
| GET | `/projects/:id/ask/chats` | List persisted chats (newest first) |
| GET | `/projects/:id/ask/chats/:chatId` | Get single chat with messages |
| PATCH | `/projects/:id/ask/chats/:chatId` | Rename chat title |
| DELETE | `/projects/:id/ask/chats/:chatId` | Delete chat |

### Public Explorer (No Auth, Read-Only)

Limited to the configured `PUBLIC_PROJECT_ID` project.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/projects/:id/status` | Project status |
| GET | `/public/projects/:id/overview` | AI documentation |
| GET | `/public/projects/:id/insights` | Insights data |
| GET | `/public/projects/:id/files` | Files page data |
| GET | `/public/projects/:id/source/files` | Source file list |
| GET | `/public/projects/:id/source/file?path=<path>` | File content |
| POST | `/public/projects/:id/ask/stream` | SSE — streaming Q&A (ephemeral) |

### Admin APIs (Protected, Admin Only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Global platform statistics |
| GET | `/admin/users` | List non-admin users with usage |
| POST | `/admin/users/:id/notify` | Send notification email to user |
| PATCH | `/admin/users/:id/block` | Block/unblock user |
| DELETE | `/admin/users/:id` | Delete user + all associated data |

---

## Available Scripts

### Root

```bash
dev.bat                 # Starts client and server dev processes in separate terminals
```

### Client

```bash
npm run dev             # Start Vite dev server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

### Server

```bash
npm run dev             # Start server with nodemon
npm start               # Start production server
npm run seed:admin      # Seed admin user (sd22.rsr@gmail.com)
npm test                # Placeholder test script
```

---

## Project Structure

```text
CodeAtlas/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/            # SVG logos and icons
│   │   ├── components/
│   │   │   ├── ui/            # shadcn-style UI primitives (28 components)
│   │   │   ├── Header.jsx     # Navigation bar
│   │   │   ├── ProtectedRoute.jsx  # Auth gate
│   │   │   ├── FileTree.jsx   # Recursive file tree
│   │   │   ├── FileDetails.jsx# File metadata panel
│   │   │   ├── SectionHeader.jsx   # Section heading
│   │   │   └── TintedBadge.jsx# Color-coded badges
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx # Auth state (login/logout/session/blocked)
│   │   │   └── ThemeContext.jsx# Fixed dark mode
│   │   ├── hooks/
│   │   │   ├── usePersistentState.js  # localStorage-backed state
│   │   │   └── use-mobile.js  # Responsive breakpoint
│   │   ├── lib/
│   │   │   ├── utils.js       # cn() helper (clsx + tailwind-merge)
│   │   │   └── codeTheme.js   # Prism syntax theme
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Landing page
│   │   │   ├── Login.jsx          # Sign in
│   │   │   ├── Register.jsx       # Sign up
│   │   │   ├── VerifyEmail.jsx    # OTP verification
│   │   │   ├── ForgotPassword.jsx # Password reset request
│   │   │   ├── ResetPassword.jsx  # OTP + new password
│   │   │   ├── UploadProject.jsx  # ZIP/Git wizard with SSE progress
│   │   │   ├── UserDashboard.jsx  # Project list with share/delete
│   │   │   ├── ProjectDashboard.jsx   # Auth project shell (5 tabs)
│   │   │   ├── PublicProjectDashboard.jsx # Public demo shell (5 tabs)
│   │   │   ├── Overview.jsx       # AI documentation viewer
│   │   │   ├── Insights.jsx       # Stats, features, file metadata
│   │   │   ├── Files.jsx          # File tree + file details
│   │   │   ├── Source.jsx         # Syntax-highlighted code viewer
│   │   │   ├── Ask.jsx            # AI chat with SSE streaming
│   │   │   ├── AdminDashboard.jsx # Admin stats + user management
│   │   │   └── NotFound.jsx       # 404 page
│   │   ├── services/
│   │   │   └── api.js         # Axios instance + all API endpoint functions
│   │   ├── themes/
│   │   │   └── customTheme.ts # oneDark Prism theme
│   │   ├── App.jsx            # Root app with lazy routing
│   │   ├── App.css
│   │   ├── index.css          # Tailwind v4 theme + global styles
│   │   └── main.jsx           # Entry point
│   └── package.json
├── server/
│   ├── src/
│   │   ├── analysis/
│   │   │   ├── index.js          # Pipeline trigger (fire-and-forget)
│   │   │   ├── ai.service.js     # OpenAI LLM/embedding client
│   │   │   ├── docGenerator.js   # 4-step documentation orchestrator
│   │   │   ├── embeddingStore.js # Embedding generation + storage
│   │   │   ├── progressEmitter.js# SSE EventEmitter singleton
│   │   │   └── ragChunker.js     # RAG chunking (6 chunk types)
│   │   ├── config/
│   │   │   ├── db.js             # MongoDB connection
│   │   │   └── upload.config.js  # Upload path + limits
│   │   ├── controllers/
│   │   │   ├── admin.controller.js   # Admin dashboard
│   │   │   ├── ask.controller.js     # Q&A chat
│   │   │   ├── auth.controller.js    # Authentication
│   │   │   ├── files.controller.js   # Files/features/source
│   │   │   ├── insights.controller.js# Insights page
│   │   │   ├── overview.controller.js# Overview + SSE
│   │   │   ├── projects.controller.js# CRUD + sharing
│   │   │   ├── public.controller.js  # Public explorer
│   │   │   └── upload.controller.js  # ZIP/Git ingestion
│   │   ├── middleware/
│   │   │   ├── asyncHandler.js           # Async error wrapper
│   │   │   ├── auth.middleware.js         # JWT + role guards
│   │   │   ├── errorHandler.middleware.js# Global error handler
│   │   │   ├── rateLimit.middleware.js    # Rate limiter
│   │   │   ├── requestLogger.middleware.js# HTTP request logger
│   │   │   ├── upload.middleware.js       # Multer handler
│   │   │   └── validate.middleware.js     # ObjectId validator
│   │   ├── models/
│   │   │   ├── Chat.js       # Chat sessions + messages
│   │   │   ├── Embedding.js  # Vector embeddings
│   │   │   ├── Feature.js    # Feature groupings
│   │   │   ├── File.js       # Scanned file data
│   │   │   ├── Project.js    # Project metadata
│   │   │   └── User.js       # User accounts
│   │   ├── routes/
│   │   │   ├── api.route.js  # Central route aggregator
│   │   │   ├── admin.route.js
│   │   │   ├── ask.route.js
│   │   │   ├── auth.route.js
│   │   │   ├── files.route.js
│   │   │   ├── insights.route.js
│   │   │   ├── overview.route.js
│   │   │   ├── project-core.route.js
│   │   │   ├── public.route.js
│   │   │   ├── source.route.js
│   │   │   └── upload.route.js
│   │   ├── scripts/
│   │   │   └── seed-admin.js  # Admin user seeder
│   │   ├── services/
│   │   │   ├── chat.service.js       # RAG retrieval + context
│   │   │   ├── email.service.js      # Brevo transactional email
│   │   │   ├── git.service.js        # Git clone
│   │   │   ├── mernValidator.service.js # MERN stack validation
│   │   │   ├── scan.service.js       # Static code scanner (2544 lines)
│   │   │   ├── storage.service.js    # MongoDB persistence
│   │   │   └── zip.service.js        # ZIP extraction
│   │   ├── utils/
│   │   │   ├── featureDetector.js    # Hub-based feature detection
│   │   │   ├── frameworkDetector.js  # Import-based framework detection
│   │   │   ├── ignoreFolders.js      # File/folder ignore rules
│   │   │   ├── logger.js             # Console logger
│   │   │   ├── projectAccess.js      # Access control helpers
│   │   │   └── relationshipBuilder.js# Import/uses graph
│   │   └── server.js          # Express entry point
│   └── package.json
├── dev.bat
└── README.md
```

---

## Security Features

- JWT in HttpOnly cookies (primary auth) + Bearer header + query param (SSE fallback)
- Password hashing with bcrypt (12 salt rounds)
- Email verification and reset OTP flow (6-digit codes, 10-min expiry)
- Account block enforcement (checked on login + every authenticated request)
- Rate limiting for auth/upload routes (15 requests / 15 minutes)
- Helmet security headers + CORS origin validation
- Upload validation (ZIP-only, file size limit, MERN validation)
- Centralized API error handling with `asyncHandler` wrapper
- Global uncaught exception / unhandled rejection handlers
- Graceful shutdown on SIGTERM/SIGINT

---

## Key Architecture Decisions

### Static Code Scanner (scan.service.js, 2544 lines)
Performs static analysis without AST parsing: path-based classification (270+ patterns), content-based scoring (regex), ESM + CJS import extraction, route detection, API call detection, and JSX component detection.

### Feature Detection (featureDetector.js, 845 lines)
Hub-based algorithm: identifies entry-point files (controllers, pages, routes) as hubs, extracts feature names via naming convention analysis, then traverses the import graph (depth-limited to 2) with sibling discovery in component directories.

### RAG Pipeline (chat.service.js, 1116 lines)
Intent classification → query expansion → parallel retrieval (direct + feature + vector) → two-pass Atlas search → scoring with tier boost + relevance penalty + gap detection → diversity reranking → context building → LLM answer.

### Email Service (email.service.js, 703 lines)
Migrated from SendGrid to Brevo REST API. Features dark-themed HTML templates, retry with exponential backoff (up to 4 attempts), console fallback for development, and credential fingerprinting for safe logging.

### State Management
No global state manager. Uses React Query for all server state, AuthContext for session, `usePersistentState` (localStorage-backed) for per-project/per-tab UI state, and local `useState` for transient UI.

---

## Available Environment Variables

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/codeatlas` | MongoDB connection string |
| `JWT_SECRET` | (required) | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | JWT expiration duration |
| `CORS_ORIGINS` | `http://localhost:5173,https://codeatlas-seven.vercel.app` | Allowed origins |
| `UPLOAD_DIR` | `./src/temp` | Temp upload directory |
| `OPENAI_API_KEY` | (required for AI) | OpenAI API key |
| `PUBLIC_PROJECT_ID` | (none) | Public explorer project ID |
| `SELF_PING_URL` | Render deployment URL | Uptime ping target |
| `SELF_PING_INTERVAL_MS` | `600000` | Self-ping interval (10 min) |
| `BREVO_API_KEY` | (required for email) | Brevo REST API key |
| `BREVO_FROM_EMAIL` | (required) | Verified sender email |
| `BREVO_FROM_NAME` | `CodeAtlas` | Sender display name |
| `ALLOW_EMAIL_CONSOLE_FALLBACK` | `false` | Log emails to console instead of sending |

### Client

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_PUBLIC_PROJECT_ID` | Public explorer project ID (must match server) |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m "Add your feature"`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
