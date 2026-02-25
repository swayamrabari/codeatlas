import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import uploadRoutes from './routes/upload.route.js';
import projectRoutes from './routes/project.route.js';
import authRoutes from './routes/auth.route.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📨 ${new Date().toISOString()}`);
  console.log(`   ${req.method} ${req.url}`);
  console.log(`   Content-Type: ${req.headers['content-type']}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (before auth-protected routes)
app.get('/api', (req, res) => {
  res.send('Server is running');
});

// health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', projectRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  console.error('   Stack:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Connect to MongoDB then start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
    console.log(
      `📁 Upload directory: ${process.env.UPLOAD_DIR || './src/temp'}`,
    );
  });

  // Increase server timeout for long operations like git clone
  server.keepAliveTimeout = 300000; // 5 minutes
  server.headersTimeout = 310000;
});
