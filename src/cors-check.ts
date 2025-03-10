// Simple CORS check script
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());

app.get('/api/check', (req, res) => {
  res.json({ message: 'CORS enabled server is running' });
});

app.listen(4000, () => {
  console.log('CORS diagnostic server is running on port 4000');
});