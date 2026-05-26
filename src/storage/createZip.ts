import fs from 'fs';
import path from 'path';
import yazl from 'yazl';

export function createZipStream(zipPath: string) {

  fs.mkdirSync(path.dirname(zipPath), {
    recursive: true
  });

  const zipfile = new yazl.ZipFile();

  const output = fs.createWriteStream(zipPath);
  zipfile.outputStream.pipe(output);

  const done = new Promise<void>((resolve, reject) => {
    output.on('close', resolve);
    zipfile.outputStream.on('error', reject);
  });

  return { zipfile, done };
}