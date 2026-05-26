import express from 'express';
import fs from 'fs';
import path from 'path';
import { verifySignedUrl } from '@/storage/signedUrl.js';

export const downloadRouter = express.Router();

downloadRouter.get('/:token', (req, res) => {
  const filePath = verifySignedUrl(req.params.token);

  if (!filePath)
    return res.status(403).send('invalid token');

  const fullPath = path.join(process.cwd(), 'recordings', filePath);

  if (!fs.existsSync(fullPath))
    return res.status(404).send(`${filePath} file not found`);

  res.download(fullPath);
});