import multer from 'multer';
import path from 'path';

// Max file size: 2MB for text-based sensitive document scanning
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ['.txt', '.csv', '.json', '.log', '.md', '.tsv', '.xml', '.yaml', '.yml'];

const storage = multer.memoryStorage();

export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext) || file.mimetype.startsWith('text/') || file.mimetype === 'application/json' || file.mimetype === 'application/csv') {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext || file.mimetype}. Supported formats: .txt, .csv, .json, .log, .md, .tsv, .xml, .yaml`));
    }
  },
});
