# CodeAtlas

<div align="center">

**AI-powered repository intelligence platform for code analysis, documentation, and grounded project Q&A**

[Features](#features) | [Tech Stack](#tech-stack) | [Getting Started](#getting-started) | [App Routes](#app-routes) | [API Documentation](#api-documentation)

</div>

---

## Overview

CodeAtlas helps developers understand unfamiliar repositories quickly by combining static scanning, feature detection, relationship mapping, AI documentation generation, and contextual chat over the analyzed codebase.

You can ingest projects from ZIP uploads or Git URLs, then explore them through dedicated pages for Overview, Insights, Files, Source, and Ask.

## Features

### Project Ingestion and Analysis

- Upload `.zip` archives (max 100MB) or import from Git URL.
- Automatic scanning of file metadata, routes, imports/exports, dependencies, and relationships.
- Feature grouping with categorized frontend/backend/shared ownership.
- Persisted project statistics (frameworks, total files, feature count, relationship stats).

### AI Documentation Workflow

- Background AI documentation generation after project ingestion.
- Overview-level, feature-level, and file-level documentation.
- Live documentation progress streaming via Server-Sent Events (SSE).
- Selective regeneration for project overview, a feature, or a single file.

### AI Assistant (Grounded Q&A)

- Ask contextual questions against indexed project chunks.
- Non-stream and SSE stream answer endpoints.
- Citations with file paths and metadata.
- Persistent project chat history with rename and delete support.

### Collaboration and Public Explorer

- Project sharing with verified users (owner-managed share list).
- Share suggestions endpoint for quick collaborator lookup.
- Public Explorer endpoints for a configured showcase project ID.

### Authentication and Admin Controls

- JWT auth with protected routes.
- Email verification with 6-digit OTP.
- Forgot-password flow with OTP verification.
- Admin dashboard endpoints for global stats, user management, blocking/unblocking, and notifications.

### Security and Reliability

- Helmet security headers, CORS policy, centralized error handling.
- Rate limiting on auth/upload related endpoints.
- Account blocking enforcement across protected APIs.
- Graceful shutdown and health endpoint support.

## Tech Stack

### Frontend

- **React 19**
- **Vite 7**
- **React Router DOM 7**
- **Tailwind CSS 4**
- **TanStack React Query**
- **Axios**
- **Radix UI**
- **Mermaid**
- **React Markdown + remark-gfm**

### Backend

- **Node.js**
- **Express 5**
- **MongoDB + Mongoose**
- **Multer** (ZIP uploads)
- **simple-git** (Git import)
- **jsonwebtoken + bcrypt**
- **Brevo REST Email API**
- **helmet + cors + express-rate-limit**

### AI Layer

- **OpenAI API**
- **@langchain/openai**
- Custom chunking, embeddings, retrieval, and doc generation pipeline

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MongoDB instance
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
   # Required: comma-separated frontend origins. No hardcoded fallback in code.
   CORS_ORIGINS=http://localhost:5173,https://your-frontend-domain
   UPLOAD_DIR=./src/temp

   # Public Explorer
   PUBLIC_PROJECT_ID=<mongo-project-id-used-for-public-explorer>

   # Optional uptime self-ping
   SELF_PING_URL=https://your-backend-domain/health
   SELF_PING_INTERVAL_MS=600000

   # Email (Brevo REST API)
   # Required by email service:
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

## App Routes

### Public Frontend Routes

- `/`
- `/explore/*` (public demo dashboard)
- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

### Protected Frontend Routes

- `/dashboard`
- `/upload` (non-admin only)
- `/project/:id/*` with tabs:
  - `/project/:id/overview`
  - `/project/:id/insights`
  - `/project/:id/files`
  - `/project/:id/source`
  - `/project/:id/ask`
- `/admin` (admin only)

## API Documentation

Base URL: `http://localhost:5000/api`

### Health

- `GET /api` - API heartbeat message
- `GET /health` - service health probe

### Auth (Public)

- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/login`
- `POST /auth/resend-code`
- `POST /auth/forgot-password`
- `POST /auth/verify-reset-code`
- `POST /auth/reset-password`

### Auth (Protected)

- `GET /auth/me`

### Project Ingestion (Protected, Non-admin)

- `POST /upload` - ZIP upload + scan + async docs pipeline trigger
- `POST /upload-git` - clone repository + scan + async docs pipeline trigger

### Project Management and Sharing (Protected)

- `GET /projects` - list owned and shared projects
- `GET /projects/share/suggestions?q=<email-fragment>`
- `GET /projects/:id/status`
- `GET /projects/:id/share` - owner only
- `PATCH /projects/:id/share` - owner only
- `DELETE /projects/:id` - owner only

### Overview Page APIs (Protected)

- `GET /projects/:id/overview`
- `GET /projects/:id/overview/progress` (SSE)
- `POST /projects/:id/overview/regenerate`
- `POST /projects/:id/overview/regenerate/feature`
- `POST /projects/:id/overview/regenerate/file`

### Insights, Files, Source APIs (Protected)

- `GET /projects/:id/insights`
- `GET /projects/:id/files`
- `GET /projects/:id/files/features`
- `GET /projects/:id/files/features/:keyword`
- `GET /projects/:id/source/files`
- `GET /projects/:id/source/file?path=<relative-file-path>`

### Ask APIs (Protected)

- `POST /projects/:id/ask`
- `POST /projects/:id/ask/stream` (SSE)
- `GET /projects/:id/ask/chats`
- `GET /projects/:id/ask/chats/:chatId`
- `PATCH /projects/:id/ask/chats/:chatId`
- `DELETE /projects/:id/ask/chats/:chatId`

### Public Explorer APIs (No Auth)

These routes are limited to the configured `PUBLIC_PROJECT_ID`.

- `GET /public/projects/:id/status`
- `GET /public/projects/:id/overview`
- `GET /public/projects/:id/insights`
- `GET /public/projects/:id/files`
- `GET /public/projects/:id/source/files`
- `GET /public/projects/:id/source/file?path=<relative-file-path>`
- `POST /public/projects/:id/ask/stream`

### Admin APIs (Protected, Admin Only)

- `GET /admin/stats`
- `GET /admin/users`
- `POST /admin/users/:id/notify`
- `PATCH /admin/users/:id/block`
- `DELETE /admin/users/:id`

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
npm start               # Start server
npm run seed:admin      # Seed admin user
npm test                # Placeholder test script
```

## Project Structure

```text
CodeAtlas/
|-- client/
|   |-- public/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |   `-- ui/
|   |   |-- contexts/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- themes/
|   |   |-- App.jsx
|   |   `-- main.jsx
|   `-- package.json
|-- server/
|   |-- src/
|   |   |-- analysis/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- scripts/
|   |   |-- services/
|   |   |-- utils/
|   |   `-- server.js
|   `-- package.json
|-- dev.bat
`-- README.md
```

## Security Features

- JWT-protected APIs
- Password hashing with bcrypt
- Email verification and reset OTP flow
- Account block enforcement
- Rate limiting for auth/upload routes
- Helmet + CORS hardening
- Upload validation for ZIP-only ingestion
- Centralized API error handling

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m "Add your feature"`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
