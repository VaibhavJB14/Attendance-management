import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const documents = await prisma.document.findMany({
      where: {
        tenantId: session.tenantId,
        studentId: studentId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const studentId = formData.get('studentId') as string | null;

    if (!file || !title || !studentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Save the file
    const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, uniqueFilename);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    await fs.writeFile(filePath, fileBuffer);

    // Public URL path
    const fileUrl = `/uploads/${uniqueFilename}`;

    // Create DB record
    const document = await prisma.document.create({
      data: {
        tenantId: session.tenantId,
        studentId,
        title,
        fileUrl,
        uploadedBy: session.id
      }
    });

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }

    // Get the document to find the fileUrl
    const document = await prisma.document.findUnique({
      where: { id, tenantId: session.tenantId }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from filesystem
    if (document.fileUrl.startsWith('/uploads/')) {
      const fileName = document.fileUrl.replace('/uploads/', '');
      const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn('Failed to delete file from filesystem (might not exist):', filePath);
      }
    }

    // Delete from DB
    await prisma.document.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
