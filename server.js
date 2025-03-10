import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';  // You'll need to install this: npm install cors

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
// Support multiple CORS origins by splitting a comma-separated string
const CORS_ORIGIN = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
  '*';

// Create the express app
const app = express();

// Apply middleware
app.use(express.json());
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from the dist directory with caching
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: NODE_ENV === 'production' ? '1d' : 0
}));

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    timezone: process.env.TZ || 'UTC'
  });
});

// Handle all routes by serving the index.html file (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`Current timezone: ${process.env.TZ || 'UTC'}`);
  if (NODE_ENV === 'development') {
    console.log(`Open http://localhost:${PORT} in your browser`);
  }
});