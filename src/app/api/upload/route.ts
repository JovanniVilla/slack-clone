import { mkdir, writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

import { auth } from '@/auth';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let buffer: Buffer;
    let ext = 'png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return new NextResponse('No file provided', { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return new NextResponse('Invalid file type. Only images are allowed.', { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return new NextResponse('File size exceeds the 10MB limit.', { status: 400 });
      }

      ext = file.name.split('.').pop() || 'png';
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      // Raw binary upload
      const mime = contentType.split(';')[0].trim();
      if (!ALLOWED_MIME_TYPES.includes(mime)) {
        return new NextResponse('Invalid file type. Only images are allowed.', { status: 400 });
      }

      const bytes = await req.arrayBuffer();
      if (bytes.byteLength > MAX_FILE_SIZE) {
        return new NextResponse('File size exceeds the 10MB limit.', { status: 400 });
      }

      if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('png')) ext = 'png';
      else if (mime.includes('gif')) ext = 'gif';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('svg')) ext = 'svg';

      buffer = Buffer.from(bytes);
    }

    const filename = `${crypto.randomUUID()}.${ext}`;
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(/*turbopackIgnore: true*/ uploadDir, filename), buffer);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      storageId: fileUrl,
      url: fileUrl,
    });
  } catch (error) {
    console.error('[UPLOAD_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
