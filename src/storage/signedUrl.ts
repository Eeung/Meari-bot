import jwt from 'jsonwebtoken';

const SECRET = process.env.DOWNLOAD_SECRET!;

export function createSignedUrl(filePath: string) {
  const token = jwt.sign(
    { filePath },
    SECRET,
    { expiresIn: '7d' }
  );

  return token;
}

export function verifySignedUrl(token: string): string | null {
  try {
    const decoded = jwt.verify(token, SECRET) as any;
    return decoded.filePath;
  } catch {
    return null;
  }
}