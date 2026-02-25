# CodeAtlas - Comprehensive Development Plan

## 🎯 Project Overview

**CodeAtlas** is a GenAI-powered platform designed to help developers understand existing codebases through intelligent analysis and visualization.

### Core Capabilities

- Project upload and analysis (ZIP or Git repositories)
- Automated documentation generation
- Interactive architecture diagrams
- Code explorer with AI-powered explanations
- Context-aware Q&A chatbot scoped to specific codebases

### Core Design Principle

**Analyze once using pattern matching (NO AST), then reuse results everywhere.**

---

## 📋 Prerequisites & Initial Setup

### Project Structure Initialization

The project follows a monorepo structure:

```
codeatlas/
├── backend/          # Node.js API server
├── frontend/         # React application
└── README.md         # Root documentation
```

### Environment Configuration

**Backend Environment Variables** (`.env`):

- `MONGODB_URI` - MongoDB Atlas connection string
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - AI service key
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)

**Frontend Environment Variables** (`.env`):

- `VITE_API_URL` - Backend API URL (default: http://localhost:5000/api)

---

## 🔧 PART 1: Backend Development

### 1.1 Backend Foundation Setup

**Objective**: Initialize the Node.js backend with required dependencies and folder structure.

**Steps**:

1. Navigate to `/backend` folder
2. Initialize npm with `npm init -y`
3. Install core dependencies:
   ```bash
   npm install express cors dotenv multer adm-zip simple-git mongoose
   npm install openai @anthropic-ai/sdk
   npm install @langchain/openai @langchain/mongodb
   npm install glob fast-glob ignore axios uuid joi
   ```
4. Install development dependencies:
   ```bash
   npm install -D nodemon
   ```
5. Create the following folder structure:
   ```
   src/
   ├── config/       # Configuration files
   ├── models/       # Database models
   ├── services/     # Business logic services
   ├── controllers/  # Request handlers
   ├── routes/       # API routes
   ├── utils/        # Utility functions
   └── index.js      # Application entry point
   ```
6. Add development script to `package.json`:
   ```json
   {
     "scripts": {
       "dev": "nodemon src/index.js"
     }
   }
   ```

---

### 1.2 Database Models

**Objective**: Define MongoDB schemas for storing project data, analysis results, and embeddings.

**Location**: `src/models/`

#### Project Model (`Project.js`)

**Schema Structure**:

```javascript
{
  userId: String,
  name: String,
  description: String,
  uploadType: enum ['zip', 'git'],
  status: enum ['uploading', 'analyzing', 'ready', 'failed'],

  files: [{
    path: String,              // File path relative to project root
    content: String,           // Actual source code
    type: String,              // Classification: route/controller/service/component/etc
    role: String,              // Human-readable description
    analysis: Object,          // Extracted metadata (imports, exports, routes)
    documentation: String      // AI-generated documentation
  }],

  features: [{
    name: String,              // Feature name (e.g., "authentication")
    description: String,       // AI-generated feature description
    files: [String],          // Array of file paths in this feature
    routes: [Object],         // API routes in this feature
    flowDiagram: String       // Mermaid syntax for feature flow
  }],

  overview: String,           // AI-generated project overview
  architectureDiagram: String, // Mermaid syntax for architecture
  metadata: Object,           // Project type, frameworks, dependencies

  timestamps: true            // Adds createdAt, updatedAt
}
```

**Indexes Required**:

- `userId` - For user-specific queries
- `status` - For filtering by project status

---

### 1.3 File Processing Service

**Objective**: Handle file system operations including reading, filtering, and classifying files.

**Location**: `src/services/fileProcessor.js`

**Implementation Requirements**:

1. **Constructor Configuration**:
   - Accept `projectPath` as parameter
   - Define default ignore patterns:
     - `node_modules`, `.git`, `dist`, `build`, `.next`
     - `*.log`, `package-lock.json`, `.env*`
     - `*.min.js`, `*.bundle.js`

2. **Method: `getAllFiles()`**:
   - Use `fast-glob` to scan directory
   - Read `.gitignore` if present and add patterns to ignore list
   - Return array of relative file paths

3. **Method: `readFile(filePath)`**:
   - Check file size (skip if > 1MB)
   - Read file content as UTF-8
   - Return `null` for binary or unreadable files
   - Handle errors gracefully

4. **Method: `classifyFile(filePath)`**:
   - **LAYER 1: Path-based classification**
   - Check folder names: `routes/`, `controllers/`, `services/`, `models/`, `components/`, `pages/`
   - Check filename patterns: `*controller.js`, `*service.js`, `*model.js`
   - Check file extensions: `.jsx`/`.tsx` → frontend, `.html` → markup
   - Return classification object: `{ type, role, category }`

   **Possible Types**: route, controller, service, model, component, page, config, test, utility, etc.

   **Categories**: backend, frontend, database, infrastructure

5. **Helper Methods**:
   - `isConfigFile(filename)` - Checks against known config file names
   - `isBackendPath(dir)` - Checks for backend-related keywords
   - `isFrontendPath(dir)` - Checks for frontend-related keywords
   - `isTestFile(filePath)` - Checks for `.test.` or `.spec.` patterns
   - `isEntryPoint(filename)` - Checks for `index.js`, `main.js`, `app.js`

---

### 1.4 Code Analysis Service

**Objective**: Analyze source code using pattern matching to extract structural information.

**Location**: `src/services/codeAnalyzer.js`

**Critical Note**: This service uses REGEX PATTERNS ONLY - NO AST parsing libraries.

**Implementation Requirements**:

1. **Define Regex Patterns** (in constructor):

   ```javascript
   patterns = {
     es6Import: /import\s+.*from\s+['"]([^'"]+)['"]/g,
     commonjsRequire: /require\s*\(\s*['"]([^'"]+)['"]/g,
     es6Export: /export\s+(const|let|function|class)/g,
     expressRoute:
       /(router|app)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
     reactComponent: /<([A-Z]\w+)/g,
     fetchCall: /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
     axiosCall:
       /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
     mongooseSchema: /new\s+Schema\s*\(/,
     // Add more patterns as needed
   };
   ```

2. **Method: `analyzeJavaScript(code, filePath)`**:
   - Apply all regex patterns to code
   - Extract and return:
     ```javascript
     {
       imports: [],        // Array of import paths
       exports: [],        // Array of export information
       routes: [],         // Array of { method, path, handler }
       apiCalls: [],       // Array of { type, method, url }
       components: [],     // Array of React component names
       hasDatabase: false  // Boolean if database code detected
     }
     ```

3. **Method: `classifyByContent(code, filePath)`** - **LAYER 2 Classification**:
   - **Scoring System**:
     - Initialize score object for all possible types
     - Scan code and increment scores based on patterns:
       - `router.get` → +10 to route score
       - `req`, `res` parameters → +8 to controller score
       - `res.json`/`res.send` → +2 per occurrence to controller
       - `new Schema` → +15 to model score
       - JSX elements → +2 per element to component score
       - React hooks (`useState`, etc.) → +3 per hook to component score
     - Apply negative scoring (e.g., if has routes, reduce service score)
     - Return highest scoring type if score >= 5

4. **Method: `buildRelationshipGraph(files)`**:
   - Iterate through each file's imports
   - Find the target file being imported
   - Create relationship object: `{ from: filePath, to: targetPath, type: 'imports' }`
   - Handle relative imports (`./`, `../`)
   - Handle absolute imports (`@/`, `~/`)
   - Return array of all relationships

5. **Helper Methods**:
   - `resolveImport(importPath, currentFile, allFiles)` - Resolve import to actual file
   - `isExternalPackage(importPath)` - Check if import is external (npm package)
   - `normalizePath(path)` - Normalize path by removing `..` and `.`

---

### 1.5 Feature Detection Service

**Objective**: Group related files into logical features based on naming patterns and functionality.

**Location**: `src/services/featureDetector.js`

**Implementation Requirements**:

1. **Define Feature Patterns** (in constructor):

   ```javascript
   featurePatterns = {
     authentication: [
       'auth',
       'login',
       'signup',
       'register',
       'jwt',
       'token',
       'session',
     ],
     user: ['user', 'profile', 'account', 'member'],
     product: ['product', 'item', 'catalog', 'inventory'],
     cart: ['cart', 'basket', 'shopping'],
     order: ['order', 'checkout', 'purchase', 'transaction'],
     payment: ['payment', 'stripe', 'paypal', 'billing'],
     notification: ['notification', 'email', 'sms', 'alert'],
     search: ['search', 'filter', 'query'],
     analytics: ['analytics', 'tracking', 'metrics', 'stats'],
     admin: ['admin', 'dashboard', 'management'],
     // Add 10-15 common features
   };
   ```

2. **Method: `detectFeatures(files, relationships)`**:
   - For each file, check path and content against feature keywords
   - Group files with matching keywords into features
   - For each feature, collect:
     - All file paths
     - All routes/endpoints
     - All API calls
     - All React components
   - If no features detected, fallback to behavioral grouping

3. **Method: `detectBehavioralFeatures(files, relationships)`**:
   - Fallback grouping when keyword matching fails
   - Group by what files DO:
     - "API Endpoints" - Files containing routes or `req`/`res`
     - "Data Layer" - Files with database operations
     - "User Interface" - Files with JSX/components
     - "Data Fetching" - Files with API calls
     - "Configuration" - Config and setup files

4. **Return Format**:
   ```javascript
   [
     {
       name: "Authentication",
       keyword: "auth",
       files: ["path/to/file1.js", ...],
       routes: [{method: "POST", path: "/login"}, ...],
       apiCalls: [{method: "GET", url: "/api/user"}, ...],
       components: ["LoginForm", "SignupForm"]
     }
   ]
   ```

---

### 1.6 Diagram Generation Service

**Objective**: Generate Mermaid diagram syntax for architecture and feature flow visualization.

**Location**: `src/services/diagramGenerator.js`

**Implementation Requirements**:

1. **Method: `generateArchitectureDiagram(features, files, metadata)`**:
   - Generate high-level system architecture in Mermaid syntax
   - Structure:

     ```mermaid
     graph TD
       Frontend[Frontend Layer]
       API[API Layer]
       Controllers[Controllers]
       Services[Business Logic]
       Database[Database]

       Frontend --> API
       API --> Controllers
       Controllers --> Services
       Services --> Database
     ```

   - Include layers only if corresponding files exist
   - Return complete Mermaid string

2. **Method: `generateFeatureFlowDiagram(feature, files, relationships)`**:
   - Generate detailed flow for a single feature
   - Structure:

     ```mermaid
     graph LR
       Page[User Page]
       Route[API Route]
       Controller[Controller]
       Service[Service]
       Model[Database Model]

       Page --> Route
       Route --> Controller
       Controller --> Service
       Service --> Model
     ```

   - Find and connect files in typical request flow
   - Return Mermaid string

3. **Helper Methods**:
   - `sanitizeNodeName(path)` - Convert path to valid Mermaid node ID (replace `/`, `.`, `-` with `_`)
   - `getFileName(path)` - Extract filename from full path
   - `createNode(id, label)` - Create Mermaid node syntax
   - `createEdge(from, to)` - Create Mermaid connection syntax

---

### 1.7 AI Service

**Objective**: Handle all AI/LLM operations including documentation generation and embeddings.

**Location**: `src/services/aiService.js`

**Implementation Requirements**:

1. **Initialization** (in constructor):
   - Initialize OpenAI or Anthropic client with API key from environment
   - Configure models:
     - Documentation: `gpt-4o-mini` (cost-effective, high quality)
     - Embeddings: `text-embedding-3-small`
     - Chat: `gpt-4o-mini`

2. **Method: `generateFileDocumentation(file, projectContext)`**:

   **Prompt Template**:

   ```
   You are analyzing a file in a {project type} project.

   File Path: {file.path}
   File Type: {file.type}
   File Content:
   {file.content}

   Project Context:
   - Technology Stack: {metadata.frameworks}
   - Related Files: {related files list}

   Generate concise documentation (2-3 paragraphs) that explains:
   1. What this file does
   2. Its role in the system
   3. Key functions/exports
   4. How it connects to other parts

   Keep it clear and beginner-friendly.
   ```

   - Make API call with retry logic (3 attempts)
   - Parse and return documentation text
   - Handle errors gracefully

3. **Method: `generateProjectOverview(files, features, metadata)`**:

   **Prompt Template**:

   ```
   Analyze this codebase and provide a comprehensive overview.

   Technology Stack: {metadata.frameworks}
   Total Files: {files.length}
   Detected Features: {features.map(f => f.name).join(', ')}

   Key Components:
   {summary of file types and counts}

   Generate a project overview (3-4 paragraphs) covering:
   1. What the application does
   2. Main features and capabilities
   3. Architecture approach
   4. Technology choices

   Write for someone new to the codebase.
   ```

4. **Method: `generateFeatureDescription(feature, files)`**:
   - Similar prompt structure for individual features
   - Focus on feature-specific functionality
   - 2-3 paragraphs per feature

5. **Method: `generateEmbeddings(text)`**:
   - Call OpenAI embeddings API
   - Return vector array (1536 dimensions)
   - Use for RAG/vector search functionality

6. **Method: `answerQuestion(question, relevantContext)`**:

   **Prompt Template**:

   ```
   You are an expert code assistant helping with a specific codebase.

   Relevant Code Context:
   {snippets from vector search}

   User Question: {question}

   Provide a clear, accurate answer based ONLY on the code context provided.
   Reference specific files and functions when relevant.
   If the context doesn't contain the answer, say so clearly.
   ```

7. **Batch Processing Configuration**:
   - Process files in batches of 5
   - Add 2-second delay between batches to respect rate limits
   - Implement exponential backoff for errors

---

### 1.8 Project Analyzer (Orchestrator)

**Objective**: Coordinate all analysis services to process uploaded projects.

**Location**: `src/services/projectAnalyzer.js`

**Implementation Requirements**:

1. **Method: `analyzeProject(projectPath, projectId)`**:

   **Analysis Pipeline**:

   ```
   1. Extract/Clone Project
   2. Get All Files (FileProcessor)
   3. Classify Files (LAYER 1: Path-based)
   4. Analyze Code (Extract imports, routes, etc.)
   5. Classify by Content (LAYER 2: Pattern scoring)
   6. Build Relationship Graph
   7. Detect Features
   8. Generate Diagrams
   9. Generate Documentation (Batch AI calls)
   10. Generate Embeddings
   11. Save to Database
   ```

2. **Implementation Flow**:

   ```javascript
   async analyzeProject(projectPath, projectId) {
     // Update status
     await Project.updateOne({_id: projectId}, {status: 'analyzing'});

     // 1. File Processing
     const processor = new FileProcessor(projectPath);
     const filePaths = await processor.getAllFiles();

     // 2 & 3. Read and classify files
     const files = [];
     for (const path of filePaths) {
       const content = await processor.readFile(path);
       if (!content) continue;

       const pathClassification = processor.classifyFile(path);
       files.push({
         path,
         content,
         ...pathClassification
       });
     }

     // 4 & 5. Analyze and reclassify
     const analyzer = new CodeAnalyzer();
     for (const file of files) {
       file.analysis = analyzer.analyzeJavaScript(file.content, file.path);
       const contentClass = analyzer.classifyByContent(file.content, file.path);
       if (contentClass) {
         file.type = contentClass.type;
         file.role = contentClass.role;
       }
     }

     // 6. Build relationships
     const relationships = analyzer.buildRelationshipGraph(files);

     // 7. Detect features
     const detector = new FeatureDetector();
     const features = detector.detectFeatures(files, relationships);

     // 8. Generate diagrams
     const diagramGen = new DiagramGenerator();
     const architectureDiagram = diagramGen.generateArchitectureDiagram(
       features, files, metadata
     );
     for (const feature of features) {
       feature.flowDiagram = diagramGen.generateFeatureFlowDiagram(
         feature, files, relationships
       );
     }

     // 9. Generate documentation (batched)
     const ai = new AIService();
     const batches = chunkArray(files, 5);

     for (const batch of batches) {
       await Promise.all(batch.map(async file => {
         file.documentation = await ai.generateFileDocumentation(file, context);
       }));
       await sleep(2000); // Rate limiting
     }

     const overview = await ai.generateProjectOverview(files, features, metadata);

     // 10. Generate embeddings
     for (const file of files) {
       const embedding = await ai.generateEmbeddings(
         `${file.path}\n${file.documentation}\n${file.content.substring(0, 1000)}`
       );
       await Embedding.create({
         projectId,
         filePath: file.path,
         content: file.documentation,
         embedding
       });
     }

     // 11. Save to database
     await Project.updateOne({_id: projectId}, {
       files,
       features,
       overview,
       architectureDiagram,
       metadata,
       status: 'ready'
     });
   }
   ```

3. **Error Handling**:
   - Wrap entire process in try-catch
   - On error, update status to 'failed'
   - Log detailed error information
   - Clean up temporary files

---

### 1.9 Vector Store Service

**Objective**: Manage vector embeddings for semantic search and RAG functionality.

**Location**: `src/services/vectorStore.js`

**Implementation Requirements**:

1. **Database Model** (`src/models/Embedding.js`):

   ```javascript
   {
     projectId: ObjectId,
     filePath: String,
     content: String,        // Documentation or code snippet
     embedding: [Number],    // Vector array (1536 dimensions)
     metadata: Object,
     createdAt: Date
   }
   ```

2. **Method: `storeEmbedding(projectId, filePath, content, vector)`**:
   - Create document in MongoDB
   - Store in collection with vector search index

3. **Method: `search(projectId, queryVector, topK = 5)`**:
   - Use MongoDB Vector Search
   - Query syntax:
     ```javascript
     const results = await Embedding.aggregate([
       {
         $vectorSearch: {
           index: 'vector_index',
           path: 'embedding',
           queryVector: queryVector,
           numCandidates: 100,
           limit: topK,
         },
       },
       {
         $match: { projectId: ObjectId(projectId) },
       },
       {
         $project: {
           filePath: 1,
           content: 1,
           score: { $meta: 'vectorSearchScore' },
         },
       },
     ]);
     ```
   - Return relevant file contexts

---

### 1.10 Controllers

**Objective**: Handle HTTP requests and responses.

**Location**: `src/controllers/`

#### Project Controller (`projectController.js`)

**Methods to Implement**:

1. **`uploadProject(req, res)`**:

   ```javascript
   - Extract uploaded ZIP file (multer)
   - Generate unique project ID
   - Create project record (status: 'uploading')
   - Extract ZIP to temp directory
   - Trigger projectAnalyzer.analyzeProject() asynchronously
   - Return projectId immediately
   - Continue analysis in background
   ```

2. **`uploadGitProject(req, res)`**:

   ```javascript
   - Extract gitUrl from request body
   - Generate unique project ID
   - Create project record (status: 'uploading')
   - Clone repository using simple-git
   - Trigger projectAnalyzer.analyzeProject() asynchronously
   - Return projectId
   ```

3. **`getProject(req, res)`**:

   ```javascript
   - Extract projectId from params
   - Query database for project
   - Return complete project object
   - Handle not found case
   ```

4. **`getAllProjects(req, res)`**:

   ```javascript
   - Get userId from request (if auth implemented)
   - Query projects (filter by userId if present)
   - Sort by createdAt descending
   - Return array of projects
   ```

5. **`deleteProject(req, res)`**:
   ```javascript
   - Extract projectId from params
   - Delete project document
   - Delete associated embeddings
   - Clean up file storage if applicable
   - Return success response
   ```

#### Chat Controller (`chatController.js`)

**Methods to Implement**:

1. **`askQuestion(req, res)`**:

   ```javascript
   async askQuestion(req, res) {
     const { projectId, question } = req.body;

     // 1. Generate embedding for question
     const ai = new AIService();
     const questionVector = await ai.generateEmbeddings(question);

     // 2. Search for relevant code contexts
     const vectorStore = new VectorStore();
     const relevantContexts = await vectorStore.search(projectId, questionVector, 5);

     // 3. Prepare context string
     const contextString = relevantContexts.map(ctx =>
       `File: ${ctx.filePath}\n${ctx.content}`
     ).join('\n\n---\n\n');

     // 4. Get AI answer
     const answer = await ai.answerQuestion(question, contextString);

     // 5. Return response
     res.json({
       answer,
       sources: relevantContexts.map(ctx => ({
         filePath: ctx.filePath,
         score: ctx.score
       }))
     });
   }
   ```

---

### 1.11 Routes

**Objective**: Define API endpoints and connect to controllers.

**Location**: `src/routes/`

#### Project Routes (`projectRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectController = require('../controllers/projectController');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), projectController.uploadProject);
router.post('/upload-git', projectController.uploadGitProject);
router.get('/:id', projectController.getProject);
router.get('/', projectController.getAllProjects);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
```

#### Chat Routes (`chatRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/ask', chatController.askQuestion);

module.exports = router;
```

---

### 1.12 Main Server Setup

**Objective**: Initialize Express server and configure middleware.

**Location**: `src/index.js`

**Implementation**:

```javascript
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const projectRoutes = require('./routes/projectRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

---

## 🎨 PART 2: Frontend Development

### 2.1 Frontend Foundation Setup

**Objective**: Initialize React application with Vite and required dependencies.

**Steps**:

1. Navigate to `/frontend` folder
2. Create Vite React project:
   ```bash
   npm create vite@latest . -- --template react
   ```
3. Install dependencies:
   ```bash
   npm install react-router-dom @tanstack/react-query axios
   npm install react-hot-toast
   npm install @monaco-editor/react
   npm install mermaid
   npm install lucide-react
   ```
4. Install Tailwind CSS:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
5. Configure Tailwind (in `tailwind.config.js`):
   ```javascript
   export default {
     content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
     theme: {
       extend: {},
     },
     plugins: [],
   };
   ```

---

### 2.2 Project Structure

**Folder Organization**:

```
src/
├── components/       # Reusable UI components
│   ├── CodeExplorer.jsx
│   ├── FileTree.jsx
│   ├── MermaidDiagram.jsx
│   ├── ChatInterface.jsx
│   └── UploadForm.jsx
├── pages/           # Page components
│   ├── Home.jsx
│   ├── UploadProject.jsx
│   └── ProjectDashboard.jsx
├── services/        # API services
│   └── api.js
├── hooks/           # Custom React hooks
│   └── useProject.js
├── utils/           # Utility functions
│   └── helpers.js
├── App.jsx          # Main app component
└── main.jsx         # Entry point
```

---

### 2.3 API Service Layer

**Objective**: Centralize all API calls for reusability.

**Location**: `src/services/api.js`

**Implementation**:

```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const projectAPI = {
  uploadZip: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/projects/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  },

  uploadGit: async (gitUrl, name) => {
    const response = await api.post('/projects/upload-git', { gitUrl, name });
    return response.data;
  },

  getProject: async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  getAllProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  deleteProject: async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },
};

export const chatAPI = {
  askQuestion: async (projectId, question) => {
    const response = await api.post('/chat/ask', { projectId, question });
    return response.data;
  },
};
```

---

### 2.4 Key Components

#### Upload Form Component

**Location**: `src/components/UploadForm.jsx`

**Features**:

- File upload with drag-and-drop
- Git URL input option
- Upload progress indicator
- Error handling
- Success message with redirect

**Implementation Guidelines**:

- Use `useState` for managing upload state
- Implement file validation (ZIP files only)
- Show progress bar during upload
- Handle both ZIP and Git upload methods
- Display toast notifications for success/error

---

#### File Tree Component

**Location**: `src/components/FileTree.jsx`

**Features**:

- Hierarchical folder structure display
- Collapsible folders
- File type icons
- File selection handler
- Search/filter functionality

**Implementation Guidelines**:

- Parse flat file paths into tree structure
- Use recursive rendering for nested folders
- Highlight selected file
- Display file type badges

---

#### Code Explorer Component

**Location**: `src/components/CodeExplorer.jsx`

**Features**:

- Monaco Editor integration for code viewing
- Syntax highlighting
- Read-only mode
- Line numbers
- Theme support (dark/light)

**Implementation Guidelines**:

```javascript
import Editor from '@monaco-editor/react';

function CodeExplorer({ file }) {
  return (
    <div className="h-full">
      <div className="bg-gray-800 text-white p-3">
        <h3>{file.path}</h3>
        <p className="text-sm text-gray-400">
          {file.type} - {file.role}
        </p>
      </div>

      <Editor
        height="600px"
        language={getLanguage(file.path)}
        value={file.content}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 14,
        }}
      />

      {file.documentation && (
        <div className="bg-blue-50 p-4 mt-4">
          <h4 className="font-bold mb-2">AI Documentation:</h4>
          <p>{file.documentation}</p>
        </div>
      )}
    </div>
  );
}
```

---

#### Mermaid Diagram Component

**Location**: `src/components/MermaidDiagram.jsx`

**Features**:

- Render Mermaid diagrams from text syntax
- Pan and zoom support
- Export as image
- Error handling for invalid syntax

**Implementation Guidelines**:

```javascript
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

function MermaidDiagram({ diagram, title }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (diagram && containerRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
      });

      containerRef.current.innerHTML = diagram;
      mermaid.contentLoaded();
    }
  }, [diagram]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <div ref={containerRef} className="mermaid overflow-auto" />
    </div>
  );
}
```

---

#### Chat Interface Component

**Location**: `src/components/ChatInterface.jsx`

**Features**:

- Message input with send button
- Message history display
- Loading indicator during AI response
- Source file references
- Auto-scroll to latest message

**Implementation Guidelines**:

- Use `useState` for messages array
- Implement message submission handler
- Display user and AI messages differently
- Show source files with clickable links
- Add typing indicator for AI responses

---

### 2.5 Pages

#### Home Page

**Location**: `src/pages/Home.jsx`

**Content**:

- Welcome message
- Feature highlights
- Call-to-action button (Upload Project)
- Recent projects list
- Usage statistics (optional)

---

#### Upload Project Page

**Location**: `src/pages/UploadProject.jsx`

**Features**:

- UploadForm component integration
- Upload method selection (ZIP vs Git)
- Progress tracking
- Redirect to dashboard on completion

---

#### Project Dashboard Page

**Location**: `src/pages/ProjectDashboard.jsx`

**Layout**:

```
+----------------------------------+
|  Project Overview Section        |
+----------------------------------+
|  Architecture Diagram            |
+----------------------------------+
|        |                         |
| File   |   Code Explorer          |
| Tree   |   +                      |
|        |   Documentation          |
|        |                         |
+--------+--------------------------+
|  Feature List with Flow Diagrams |
+----------------------------------+
|  Chat Interface                  |
+----------------------------------+
```

**Features**:

- Load project data on mount
- Display project metadata and overview
- Render architecture diagram
- File tree with code explorer
- Feature sections with flow diagrams
- Chat interface for Q&A
- Loading states for async data

---

### 2.6 React Query Integration

**Objective**: Manage server state efficiently.

**Location**: `src/hooks/useProject.js`

**Implementation**:

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectAPI } from '../services/api';

export const useProject = (projectId) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectAPI.getProject(projectId),
    enabled: !!projectId,
    refetchInterval: (data) => {
      // Poll every 3s if status is 'analyzing'
      return data?.status === 'analyzing' ? 3000 : false;
    },
  });
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.getAllProjects(),
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId) => projectAPI.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
```

---

### 2.7 Routing Setup

**Objective**: Configure application routes.

**Location**: `src/App.jsx`

**Implementation**:

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import Home from './pages/Home';
import UploadProject from './pages/UploadProject';
import ProjectDashboard from './pages/ProjectDashboard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<UploadProject />} />
          <Route path="/project/:id" element={<ProjectDashboard />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

---

## 🗄️ PART 3: Database Configuration

### 3.1 MongoDB Atlas Setup

**Objective**: Configure cloud database with vector search capability.

**Manual Steps** (to be documented in README):

1. Create MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create new cluster (M0 Free Tier)
3. Create database user with password
4. Network Access: Add IP `0.0.0.0/0` (for development)
5. Get connection string
6. Create database named `codeatlas`
7. Create collections:
   - `projects`
   - `embeddings`

### 3.2 Vector Search Index Configuration

**Collection**: `embeddings`

**Index Name**: `vector_index`

**Index Definition** (JSON):

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

**Setup Steps**:

1. Navigate to Atlas Search tab in cluster
2. Create Search Index on `embeddings` collection
3. Select JSON Editor
4. Paste index definition above
5. Save and wait for index to build

---

## 📚 PART 4: Documentation

### 4.1 Root README

**Objective**: Provide comprehensive project documentation.

**Location**: `/README.md`

**Sections to Include**:

1. **Project Title & Description**
   - What is CodeAtlas
   - Key features
   - Use cases

2. **Technology Stack**
   - Backend: Node.js, Express, MongoDB
   - Frontend: React, Vite, Tailwind
   - AI: OpenAI/Anthropic
   - Other libraries

3. **Prerequisites**
   - Node.js version
   - MongoDB Atlas account
   - OpenAI/Anthropic API key

4. **Installation**

   ```bash
   # Clone repository
   git clone <repo-url>

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

5. **Environment Variables**
   - List all required variables
   - Provide `.env.example` template

6. **Running Locally**

   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend (in another terminal)
   cd frontend
   npm run dev
   ```

7. **Project Structure**
   - Directory tree
   - Explanation of key folders

8. **Architecture Overview**
   - High-level architecture diagram (Mermaid)
   - Data flow explanation
   - Design decisions

9. **Contributing Guidelines**
   - Code style
   - Commit conventions
   - Pull request process

---

### 4.2 Backend README

**Location**: `/backend/README.md`

**Content**:

- Backend-specific setup instructions
- Service architecture explanation
- API endpoint documentation
- Database schema overview
- Testing guidelines

---

### 4.3 Frontend README

**Location**: `/frontend/README.md`

**Content**:

- Frontend-specific setup
- Component structure
- State management approach
- Styling guidelines
- Available scripts

---

### 4.4 API Documentation

**Location**: `/docs/API.md`

**Endpoint Documentation Format**:

````markdown
### POST /api/projects/upload

Upload a ZIP file containing a project for analysis.

**Request**:

- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `file`: ZIP file (required)

**Response**:

```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "message": "Project uploaded successfully. Analysis in progress."
}
```
````

**Status Codes**:

- 200: Success
- 400: Invalid file type
- 500: Server error

```

Include all endpoints with similar detail.

---

## 🚀 PART 5: Testing & Deployment

### 5.1 Sample Test Project

**Objective**: Create a realistic project for testing analysis features.

**Structure**:
```

sample-project/
├── backend/
│ ├── routes/
│ │ └── userRoutes.js # Express routes
│ ├── controllers/
│ │ └── userController.js # Request handlers
│ ├── services/
│ │ └── userService.js # Business logic
│ ├── models/
│ │ └── User.js # Mongoose model
│ └── config/
│ └── database.js # DB configuration
├── frontend/
│ ├── components/
│ │ ├── UserList.jsx # React component
│ │ └── UserForm.jsx # React component
│ ├── pages/
│ │ └── UsersPage.jsx # Page component
│ └── services/
│ └── api.js # API calls
└── package.json

````

**Content Guidelines**:
- Create realistic code samples
- Include various patterns (routes, components, API calls)
- Add comments for testing documentation generation
- ZIP for easy upload testing

---

### 5.2 Error Handling Standards

**Backend Error Handling**:

1. **Controller Level**:
   ```javascript
   async controllerMethod(req, res) {
     try {
       // Logic here
       res.json({ success: true, data });
     } catch (error) {
       console.error('Error in controllerMethod:', error);
       res.status(500).json({
         error: 'Operation failed',
         message: error.message
       });
     }
   }
````

2. **Input Validation**:

   ```javascript
   const Joi = require('joi');

   const schema = Joi.object({
     gitUrl: Joi.string().uri().required(),
     name: Joi.string().min(3).max(100),
   });

   const { error, value } = schema.validate(req.body);
   if (error) {
     return res.status(400).json({ error: error.details[0].message });
   }
   ```

3. **Global Error Middleware**:
   - Already implemented in main server setup
   - Logs all errors
   - Returns appropriate status codes

**Frontend Error Handling**:

1. **API Call Error Handling**:

   ```javascript
   try {
     const data = await projectAPI.uploadZip(file);
     toast.success('Upload successful!');
   } catch (error) {
     toast.error(error.response?.data?.message || 'Upload failed');
   }
   ```

2. **React Error Boundaries**:

   ```javascript
   class ErrorBoundary extends React.Component {
     state = { hasError: false };

     static getDerivedStateFromError(error) {
       return { hasError: true };
     }

     componentDidCatch(error, errorInfo) {
       console.error('Error caught:', error, errorInfo);
     }

     render() {
       if (this.state.hasError) {
         return <div>Something went wrong. Please refresh.</div>;
       }
       return this.props.children;
     }
   }
   ```

3. **React Query Error Handling**:

   ```javascript
   const { data, error, isError } = useProject(projectId);

   if (isError) {
     return <div>Error: {error.message}</div>;
   }
   ```

---

### 5.3 Environment Configuration

**Backend `.env.example`**:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codeatlas
OPENAI_API_KEY=sk-...
PORT=5000
NODE_ENV=development
```

**Frontend `.env.example`**:

```
VITE_API_URL=http://localhost:5000/api
```

**Git Configuration**:

- Add `.env` to `.gitignore`
- Commit `.env.example` files
- Document environment setup in README

---

### 5.4 Deployment Configuration

#### Backend Deployment (Docker)

**Location**: `/backend/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "src/index.js"]
```

**Docker Compose** (optional):

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - '5000:5000'
    env_file:
      - ./backend/.env
```

---

#### Frontend Deployment (Vercel)

**Location**: `/frontend/vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

---

#### Deployment Documentation

**Location**: `/docs/DEPLOYMENT.md`

**Content**:

1. **Backend Deployment** (Railway/Render/Heroku):
   - Environment variable setup
   - Build commands
   - Health check endpoint
   - Monitoring setup

2. **Frontend Deployment** (Vercel/Netlify):
   - Build configuration
   - Environment variables
   - Custom domain setup
   - Continuous deployment from Git

3. **MongoDB Atlas Production Setup**:
   - Network access restrictions
   - Database user permissions
   - Backup configuration
   - Performance monitoring

4. **Post-Deployment Checklist**:
   - Verify API connectivity
   - Test file upload
   - Confirm AI integration
   - Monitor error logs

---

## 🎯 Development Workflow

### Phase 1: Core Backend (Week 1)

**Priority Tasks**:

1. Setup backend structure and dependencies ✓
2. Create database models ✓
3. Implement FileProcessor service ✓
4. Implement CodeAnalyzer service ✓
5. Create ProjectAnalyzer orchestrator ✓
6. Build upload endpoints ✓

**Testing After Phase 1**:

- Upload sample ZIP file
- Verify file extraction and classification
- Check database records created
- Review console logs for analysis steps

---

### Phase 2: AI Integration (Week 1-2)

**Priority Tasks**:

1. Implement AIService for documentation ✓
2. Set up VectorStore service ✓
3. Add FeatureDetector service ✓
4. Implement DiagramGenerator service ✓
5. Integrate all services in ProjectAnalyzer ✓

**Testing After Phase 2**:

- Verify AI documentation quality
- Check vector embeddings stored correctly
- Confirm features detected accurately
- Review generated Mermaid diagrams

---

### Phase 3: Frontend Development (Week 2)

**Priority Tasks**:

1. Setup React app with routing ✓
2. Create UploadForm component ✓
3. Build project list page ✓
4. Implement CodeExplorer with Monaco ✓
5. Add MermaidDiagram component ✓
6. Create ProjectDashboard layout ✓

**Testing After Phase 3**:

- Upload project through UI
- Navigate between pages
- View code in Monaco editor
- Render Mermaid diagrams
- Check responsive design

---

### Phase 4: Chat & Polish (Week 2-3)

**Priority Tasks**:

1. Build ChatInterface component ✓
2. Implement chat backend endpoint ✓
3. Integrate RAG with vector search ✓
4. Add loading states and error handling ✓
5. Polish UI/UX ✓
6. Optimize performance ✓

**Testing After Phase 4**:

- Ask questions about codebase
- Verify relevant context retrieved
- Check answer quality
- Test error scenarios
- Confirm smooth user experience

---

### Phase 5: Testing & Deployment (Week 3)

**Priority Tasks**:

1. End-to-end testing with multiple projects ✓
2. Performance optimization ✓
3. Documentation completion ✓
4. Deployment setup ✓
5. Production environment testing ✓

**Final Testing Checklist**:

- Upload various project types
- Test with large codebases (100+ files)
- Verify analysis accuracy
- Check AI costs per project
- Load test API endpoints
- Test in production environment

---

## 🤖 Development Assistant Guidelines

### For AI Coding Tools (GitHub Copilot, Claude Code, Cursor)

**General Approach**:

- Read this entire document before starting implementation
- Follow the modular architecture strictly
- Implement one service at a time
- Test each component before moving to the next
- Log all analysis steps for debugging

**Key Commands**:

**For GitHub Copilot**:

```
@workspace Create the complete backend structure following the modular service
pattern with FileProcessor, CodeAnalyzer, FeatureDetector, DiagramGenerator,
and AIService as separate classes
```

**For Claude Code**:

```
Implement CodeAtlas backend:
1. Create Express server with MongoDB integration
2. Build pattern-based code analyzer using regex (NO AST)
3. Implement AI documentation generation with OpenAI
4. Add vector search with MongoDB Atlas
5. Follow the multi-layer classification approach: Path → Content → Behavior
```

**For Cursor**:

```
Build the complete CodeAtlas application:
- Monorepo: /backend (Node.js + Express + MongoDB) and /frontend (React + Vite)
- Pattern matching for code analysis (regex only, no AST parsing)
- AI documentation with OpenAI API
- RAG chatbot with vector search
- Mermaid diagrams for architecture visualization
- Follow all implementation details in the development plan
```

---

## 📝 Core Development Principles

### 1. No AST Parsing

Use regex patterns and content matching exclusively. AST parsing adds complexity and dependencies that aren't necessary for the analysis quality needed.

### 2. Multi-Layer Classification

Apply classification in stages:

- **Layer 1**: Path and filename analysis
- **Layer 2**: Content pattern scoring
- **Layer 3**: Behavioral grouping
- **Layer 4**: AI confirmation (limited use)

### 3. Batch AI Operations

Process AI calls in batches of 5 with 2-second delays to respect rate limits and control costs.

### 4. Graceful Degradation

The application should work even if:

- Some files are misclassified
- AI calls fail
- Vector search returns no results
- Diagrams can't be generated

### 5. Cost Awareness

Monitor and limit AI usage:

- Documentation: ~5-10 files per project
- Embeddings: All files (but small content chunks)
- Chat: Per user request
- Target: ₹5-₹20 per project analysis

### 6. Comprehensive Logging

Log every major step:

```javascript
console.log('📁 Processing files...');
console.log(`✅ Classified ${files.length} files`);
console.log('🔍 Analyzing code patterns...');
console.log('🎨 Generating diagrams...');
console.log('🤖 Calling AI for documentation...');
console.log('✨ Analysis complete!');
```

### 7. Error Recovery

Every async operation should have try-catch blocks. Errors should be logged but not crash the application.

### 8. Modular Architecture

Each service should be:

- Independent and testable
- Have a single responsibility
- Be reusable across the application

---

## 🎓 Success Metrics

The implementation is successful when:

**Functional Requirements**:

- ✅ Can upload ZIP and Git projects
- ✅ Analyzes 50-file project in 30-60 seconds
- ✅ Correctly classifies 85%
