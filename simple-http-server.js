// Extremely minimal HTTP server
import http from 'http';

// Try a different port
const PORT = 8000;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`);
  
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Send a simple response
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Server is running\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ALL interfaces (0.0.0.0) port ${PORT}`);
  console.log(`Try accessing:`);
  console.log(`- http://localhost:${PORT}/`);
  console.log(`- http://127.0.0.1:${PORT}/`);
});