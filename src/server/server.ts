import express from 'express';
import { downloadRouter } from '@/server/download.js';

const app = express();

app.use('/download', downloadRouter );

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`File server running on ${PORT}`);
});