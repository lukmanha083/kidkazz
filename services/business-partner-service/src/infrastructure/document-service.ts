/**
 * Document Service
 *
 * Handles document upload, serving, and deletion with Cloudflare R2 + KV cache.
 *
 * Features:
 * - Document upload (images and PDFs)
 * - Cloudflare CDN caching via KV
 * - Document validation (size, type)
 * - Secure upload with size limits
 */

export interface DocumentMetadata {
  ownerId: string;
  ownerType: 'employee' | 'customer' | 'supplier';
  documentType: 'ktp' | 'npwp' | 'contract' | 'other';
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export const DOCUMENT_CONFIG = {
  // Maximum file size: 5MB
  MAX_FILE_SIZE: 5 * 1024 * 1024,

  // Allowed MIME types
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'] as const,

  // KV cache TTL: 7 days
  CACHE_TTL: 7 * 24 * 60 * 60,
} as const;

export class DocumentService {
  constructor(
    private r2: R2Bucket,
    private kv: KVNamespace
  ) {}

  /**
   * Validate document file
   */
  validateDocument(file: File | Blob, mimeType: string): void {
    // Check MIME type
    if (!DOCUMENT_CONFIG.ALLOWED_TYPES.includes(mimeType as any)) {
      throw new Error(
        `Invalid document type. Allowed: ${DOCUMENT_CONFIG.ALLOWED_TYPES.join(', ')}`
      );
    }

    // Check file size
    if (file.size > DOCUMENT_CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `File too large. Maximum size: ${DOCUMENT_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  /**
   * Generate unique filename
   */
  generateFilename(
    ownerType: string,
    ownerId: string,
    documentType: string,
    extension: string
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${ownerType}/${ownerId}/${documentType}/${timestamp}-${random}.${extension}`;
  }

  /**
   * Get file extension from MIME type
   */
  getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf',
    };
    return map[mimeType] || 'bin';
  }

  /**
   * Upload document to R2
   */
  async uploadDocument(
    file: Blob,
    mimeType: string,
    originalName: string,
    options: {
      ownerId: string;
      ownerType: 'employee' | 'customer' | 'supplier';
      documentType: 'ktp' | 'npwp' | 'contract' | 'other';
      uploadedBy?: string;
    }
  ): Promise<{ filename: string; url: string; metadata: DocumentMetadata }> {
    // Validate document
    this.validateDocument(file, mimeType);

    // Generate filename
    const extension = this.getExtension(mimeType);
    const filename = this.generateFilename(
      options.ownerType,
      options.ownerId,
      options.documentType,
      extension
    );

    // Convert to ArrayBuffer for R2
    const arrayBuffer = await file.arrayBuffer();

    // Upload to R2
    await this.r2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        ownerId: options.ownerId,
        ownerType: options.ownerType,
        documentType: options.documentType,
        originalName,
        uploadedAt: new Date().toISOString(),
        uploadedBy: options.uploadedBy || '',
      },
    });

    // Generate metadata
    const metadata: DocumentMetadata = {
      ownerId: options.ownerId,
      ownerType: options.ownerType,
      documentType: options.documentType,
      originalName,
      mimeType,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: options.uploadedBy,
    };

    // Generate URL
    const url = `/api/employees/documents/file/${filename}`;

    return { filename, url, metadata };
  }

  /**
   * Get document from R2 with KV cache
   */
  async getDocument(
    filename: string
  ): Promise<{ data: ArrayBuffer; contentType: string; cacheHit: boolean } | null> {
    // Try KV cache first
    const cached = await this.kv.get(filename, { type: 'arrayBuffer' });
    if (cached) {
      const metadata = await this.kv.get(`${filename}:meta`, { type: 'json' });
      return {
        data: cached,
        contentType: (metadata as any)?.contentType || 'application/octet-stream',
        cacheHit: true,
      };
    }

    // Get from R2
    const object = await this.r2.get(filename);
    if (!object) {
      return null;
    }

    const documentData = await object.arrayBuffer();
    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

    // Store in KV cache
    await this.kv.put(filename, documentData, {
      expirationTtl: DOCUMENT_CONFIG.CACHE_TTL,
    });
    await this.kv.put(`${filename}:meta`, JSON.stringify({ contentType }), {
      expirationTtl: DOCUMENT_CONFIG.CACHE_TTL,
    });

    return {
      data: documentData,
      contentType,
      cacheHit: false,
    };
  }

  /**
   * Delete document from R2 and clear KV cache
   */
  async deleteDocument(filename: string): Promise<void> {
    // Delete from R2
    await this.r2.delete(filename);

    // Clear from KV cache
    await Promise.all([this.kv.delete(filename), this.kv.delete(`${filename}:meta`)]);
  }

  /**
   * Delete all documents for an owner
   */
  async deleteOwnerDocuments(ownerType: string, ownerId: string): Promise<void> {
    // List all objects with the owner prefix
    const listed = await this.r2.list({
      prefix: `${ownerType}/${ownerId}/`,
    });

    // Delete all documents
    await Promise.all(listed.objects.map((object) => this.deleteDocument(object.key)));
  }

  /**
   * Get document metadata from R2
   */
  async getDocumentMetadata(filename: string): Promise<DocumentMetadata | null> {
    const object = await this.r2.head(filename);
    if (!object) {
      return null;
    }

    return {
      ownerId: object.customMetadata?.ownerId || '',
      ownerType: (object.customMetadata?.ownerType as any) || 'employee',
      documentType: (object.customMetadata?.documentType as any) || 'other',
      originalName: object.customMetadata?.originalName || '',
      mimeType: object.httpMetadata?.contentType || 'application/octet-stream',
      size: object.size,
      uploadedAt: object.customMetadata?.uploadedAt || new Date().toISOString(),
      uploadedBy: object.customMetadata?.uploadedBy,
    };
  }
}
