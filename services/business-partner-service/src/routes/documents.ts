/**
 * Document Routes
 *
 * Handles partner document upload, serving, and deletion.
 * Uses R2 for storage and KV for CDN caching.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { partnerDocuments } from '../infrastructure/db/schema';
import { DocumentService } from '../infrastructure/document-service';

type Bindings = {
  DB: D1Database;
  PARTNER_DOCUMENTS: R2Bucket;
  DOCUMENT_CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/employees/documents/upload
 *
 * Upload employee document (KTP, NPWP, etc.)
 *
 * Body: FormData with:
 * - file: Document file (required)
 * - employeeId: Employee ID (required)
 * - documentType: 'ktp' | 'npwp' | 'contract' | 'other' (required)
 */
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const fileField = formData.get('file');

    if (!fileField || typeof fileField === 'string') {
      return c.json({ error: 'Invalid file upload' }, 400);
    }

    const file = fileField as File;
    const employeeId = formData.get('employeeId') as string;
    const documentType = formData.get('documentType') as 'ktp' | 'npwp' | 'contract' | 'other';

    // Validation
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!employeeId) {
      return c.json({ error: 'Employee ID is required' }, 400);
    }

    if (!documentType || !['ktp', 'npwp', 'contract', 'other'].includes(documentType)) {
      return c.json({ error: 'Valid document type is required (ktp, npwp, contract, other)' }, 400);
    }

    // Initialize database
    const db = drizzle(c.env.DB);

    // Initialize document service
    const documentService = new DocumentService(c.env.PARTNER_DOCUMENTS, c.env.DOCUMENT_CACHE);

    // Upload document to R2
    const result = await documentService.uploadDocument(file, file.type, file.name, {
      ownerId: employeeId,
      ownerType: 'employee',
      documentType,
    });

    // Check if there's an existing document of the same type for this employee
    const existingDocs = await db
      .select()
      .from(partnerDocuments)
      .where(
        and(
          eq(partnerDocuments.ownerType, 'employee'),
          eq(partnerDocuments.ownerId, employeeId),
          eq(partnerDocuments.documentType, documentType),
          eq(partnerDocuments.status, 'active')
        )
      );

    // Archive existing documents of the same type
    if (existingDocs.length > 0) {
      await db
        .update(partnerDocuments)
        .set({ status: 'archived', updatedAt: Date.now() })
        .where(
          and(
            eq(partnerDocuments.ownerType, 'employee'),
            eq(partnerDocuments.ownerId, employeeId),
            eq(partnerDocuments.documentType, documentType),
            eq(partnerDocuments.status, 'active')
          )
        );
    }

    // Save document metadata to database
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    await db.insert(partnerDocuments).values({
      id: documentId,
      ownerType: 'employee',
      ownerId: employeeId,
      documentType,
      filename: result.filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: result.url,
      status: 'active',
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return c.json(
      {
        success: true,
        message: 'Document uploaded successfully',
        id: documentId,
        filename: result.filename,
        url: result.url,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        documentType,
      },
      201
    );
  } catch (error) {
    console.error('Document upload error:', error);

    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Failed to upload document' }, 500);
  }
});

/**
 * GET /api/employees/documents/:employeeId
 *
 * Get all documents for an employee (excluding soft-deleted)
 */
app.get('/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const db = drizzle(c.env.DB);

    // Fetch all active documents for the employee (excluding soft-deleted)
    const documents = await db
      .select()
      .from(partnerDocuments)
      .where(
        and(
          eq(partnerDocuments.ownerType, 'employee'),
          eq(partnerDocuments.ownerId, employeeId),
          eq(partnerDocuments.status, 'active'),
          isNull(partnerDocuments.deletedAt)
        )
      );

    return c.json({
      success: true,
      documents: documents.map((doc) => ({
        id: doc.id,
        type: doc.documentType,
        url: doc.url,
        filename: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        uploadedAt: new Date(doc.uploadedAt).toISOString(),
      })),
    });
  } catch (error) {
    console.error('Fetch documents error:', error);
    return c.json({ error: 'Failed to fetch documents' }, 500);
  }
});

/**
 * GET /api/employees/documents/file/:filename{.+}
 *
 * Serve document file
 *
 * Headers:
 * - Cache-Control: public, max-age=604800 (7 days)
 * - CDN-Cache-Control: max-age=2592000 (30 days)
 */
app.get('/file/:filename{.+}', async (c) => {
  try {
    const filename = c.req.param('filename');

    // Initialize document service
    const documentService = new DocumentService(c.env.PARTNER_DOCUMENTS, c.env.DOCUMENT_CACHE);

    // Get document
    const result = await documentService.getDocument(filename);

    if (!result) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // Set cache headers
    const headers = new Headers();
    headers.set('Content-Type', result.contentType);
    headers.set('Cache-Control', 'public, max-age=604800'); // 7 days
    headers.set('CDN-Cache-Control', 'max-age=2592000'); // 30 days for CDN
    headers.set('X-Cache-Hit', result.cacheHit ? 'true' : 'false');

    // Return document
    return new Response(result.data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Document serve error:', error);
    return c.json({ error: 'Failed to serve document' }, 500);
  }
});

/**
 * DELETE /api/employees/documents/:documentId
 *
 * Soft delete document by ID (from database), and remove from R2
 */
app.delete('/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const db = drizzle(c.env.DB);

    // Get document metadata from database (excluding already deleted)
    const documents = await db
      .select()
      .from(partnerDocuments)
      .where(and(eq(partnerDocuments.id, documentId), isNull(partnerDocuments.deletedAt)));

    if (documents.length === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const document = documents[0];

    // Initialize document service
    const documentService = new DocumentService(c.env.PARTNER_DOCUMENTS, c.env.DOCUMENT_CACHE);

    // Delete document from R2 and cache
    await documentService.deleteDocument(document.filename);

    // Soft delete from database (keep audit trail)
    await db
      .update(partnerDocuments)
      .set({
        deletedAt: new Date(),
        deletedBy: null, // TODO: Get from auth context when implemented
        status: 'deleted',
        updatedAt: Date.now(),
      })
      .where(eq(partnerDocuments.id, documentId));

    return c.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Document delete error:', error);
    return c.json({ error: 'Failed to delete document' }, 500);
  }
});

export default app;
