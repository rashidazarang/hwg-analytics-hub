import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the port to use
const PORT = 3000;

// MIME types for common file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Create the server
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Parse the URL
  let filePath = req.url;
  
  // Default to index.html for root requests
  if (filePath === '/') {
    filePath = '/public/server-test.html';
  }
  
  // Remove query parameters
  filePath = filePath.split('?')[0];
  
  // Get the full path to the file
  const fullPath = path.join(__dirname, filePath);
  
  // Get the file extension
  const extname = path.extname(fullPath).toLowerCase();
  
  // Set the content type
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Read the file
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // Handle file not found
      if (err.code === 'ENOENT') {
        console.error(`File not found: ${fullPath}`);
        res.writeHead(404);
        res.end('404 - File Not Found');
        return;
      }
      
      // Handle other errors
      console.error(`Server error: ${err}`);
      res.writeHead(500);
      res.end('500 - Internal Server Error');
      return;
    }
    
    // Success - send the file
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Test page available at http://localhost:${PORT}/public/server-test.html`);
  console.log(`Press Ctrl+C to stop the server`);
});