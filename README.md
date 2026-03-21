# CodeAtlas

<div align="center">

**A modern code intelligence platform focused on MERN stack projects for analysis, documentation, and AI-powered Q&A**

[Features](#features) | [Tech Stack](#tech-stack) | [Getting Started](#getting-started) | [Project Structure](#project-structure) | [API Documentation](#api-documentation)

</div>

---

## Overview

CodeAtlas helps developers understand unfamiliar repositories quickly by combining static analysis, feature extraction, relationship mapping, AI documentation generation, and contextual project chat. The platform is focused on MERN stack projects (MongoDB, Express, React, Node.js), while still supporting broader JavaScript-based repository analysis workflows. Users can upload a ZIP archive or provide a Git repository URL, then explore files, features, and architecture-level insights through an interactive frontend dashboard.

## Features

### Project Ingestion

- **ZIP Upload Support**: Upload `.zip` projects up to 100MB via authenticated API.
- **Git Repository Import**: Clone and analyze repositories directly from remote Git URLs.
- **Per-User Project Isolation**: All projects are scoped to the authenticated user account.

### Automated Code Analysis

- **Repository Scanning**: Detects file metadata, imports, exports, routes, and module relationships.
- **Feature Clustering**: Groups files into feature-level buckets with categorized frontend/backend/shared ownership.
- **Project Statistics**: Stores framework signals, file counts, feature counts, and relationship stats.

### Documentation Pipeline

- **AI-Generated File Docs**: Produces concise and detailed documentation per file.
- **Feature and Project Docs**: Builds aggregate documentation and architecture summaries.
- **Selective Regeneration**: Regenerate docs for a single file, feature, or project overview.
- **Real-Time Progress Streaming**: Server-Sent Events endpoint for live documentation progress.

### AI Project Assistant

- **Grounded Q&A**: Ask technical questions against analyzed project context.
- **Streaming Responses**: Token-style streamed answers over SSE.
- **Persistent Chat History**: Store, list, rename, and delete chat threads per project.

### Security and Platform Reliability

- **JWT Authentication**: Token-based auth with protected routes and user scoping.
- **Email Verification Flow**: 6-digit verification code workflow for account activation.
- **Rate Limiting**: Request throttling on auth and upload endpoints.
- **Secure API Defaults**: CORS controls, Helmet hardening, payload limits, and centralized error handling.

## Tech Stack

### Frontend

- **React 19** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM v7** - Client-side routing
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Component primitives
- **TanStack React Query** - Data fetching and caching
- **Axios** - HTTP client
- **Mermaid** - Diagram rendering
- **React Markdown + remark-gfm** - Markdown rendering
- **prism-react-renderer** - Code highlighting

### Backend

- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **MongoDB + Mongoose** - Data layer and modeling
- **Multer** - ZIP upload handling
- **simple-git** - Git clone/import support
- **JWT + bcrypt** - Authentication and password security
- **Nodemailer** - Verification email delivery
- **Helmet + CORS + express-rate-limit** - API security controls

### AI and Analysis

- **OpenAI API** - LLM and embeddings
- **LangChain OpenAI** - AI orchestration utilities
- **Custom analysis pipeline** - File, feature, and relationship extraction

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm**
- **MongoDB** (local or cloud instance)
- **OpenAI API key** (required for AI documentation/chat)
- **Email credentials** (optional, for real email verification delivery)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CodeAtlas
   ```

2. **Install frontend dependencies**

   ```bash
   cd client
   npm install
   ```

3. **Install backend dependencies**

   ```bash
   cd ../server
   npm install
   ```

4. **Configure environment variables**

   Create a `.env` file in the `server` directory:

   ```env
   # Required
   MONGODB_URI=mongodb://127.0.0.1:27017/codeatlas
   JWT_SECRET=your-strong-jwt-secret
   OPENAI_API_KEY=your-openai-api-key

   # Optional (recommended)
   PORT=5000
   NODE_ENV=development
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173,http://localhost:5174
   UPLOAD_DIR=./src/temp

   # Optional (email verification via SMTP)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

   Create a `.env` file in the `client` directory:

   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. **Start the development servers**

   **Terminal 1 - Backend:**

   ```bash
   cd server
   npm run dev
   ```

   Server runs on `http://localhost:5000`

   **Terminal 2 - Frontend:**

   ```bash
   cd client
   npm run dev
   ```

   Client runs on `http://localhost:5173`

6. **Open your browser**

   Navigate to `http://localhost:5173`

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
|   |   |-- services/
|   |   |-- utils/
|   |   `-- server.js
|   `-- package.json
`-- README.md
```

## API Documentation

Base URL: `http://localhost:5000/api`

### Public Endpoints

- `GET /api` - API health message
- `GET /health` - Service health probe
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/verify-email` - Verify account with code
- `POST /api/auth/login` - User login
- `POST /api/auth/resend-code` - Resend email verification code

### Authenticated Endpoints

- `GET /api/auth/me` - Get current user profile
- `POST /api/upload` - Upload ZIP project for analysis
- `POST /api/upload-git` - Import project from Git URL
- `GET /api/projects` - List current user projects
- `GET /api/project/:id` - Get project summary and analysis output
- `GET /api/project/:id/status` - Get analysis/documentation status
- `DELETE /api/project/:id` - Delete a project and related data

### Explorer Endpoints

- `GET /api/project/:id/files` - Get lightweight file list
- `GET /api/project/:id/file?path=<file-path>` - Get file content and analysis
- `GET /api/project/:id/features` - Get all detected features
- `GET /api/project/:id/features/:keyword` - Get a feature with file references

### Documentation Endpoints

- `GET /api/project/:id/docs` - Get project/feature/file AI documentation
- `GET /api/project/:id/progress` - Stream documentation progress (SSE)
- `POST /api/project/:id/regenerate/file` - Regenerate a file doc
- `POST /api/project/:id/regenerate/feature` - Regenerate a feature doc
- `POST /api/project/:id/regenerate/project` - Regenerate project overview doc

### Chat Endpoints

- `POST /api/project/:id/ask` - Ask a grounded project question
- `POST /api/project/:id/ask/stream` - Stream grounded answer (SSE)
- `GET /api/project/:id/chats` - List saved chats
- `GET /api/project/:id/chats/:chatId` - Get chat with message history
- `PATCH /api/project/:id/chats/:chatId` - Rename chat title
- `DELETE /api/project/:id/chats/:chatId` - Delete chat

## Available Scripts

### Client Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Server Scripts

```bash
npm run dev      # Start server with nodemon
npm start        # Start server in production mode
npm test         # Placeholder test script
```

## Security Features

- **JWT Authentication** - Protected API routes and user isolation
- **Password Hashing** - Secure credential storage with bcrypt
- **Email Verification** - One-time code verification flow
- **Rate Limiting** - Throttling on sensitive endpoints
- **Helmet** - Standard security headers
- **CORS Policy** - Configurable allowed origins
- **Upload Validation** - ZIP type checks and file size limits
- **Centralized Error Handling** - Consistent API error responses

## Contributing

Contributions are welcome. Please follow this workflow:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to your branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
