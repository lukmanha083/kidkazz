import { zValidator } from '@hono/zod-validator';
import { and, eq, gte, isNotNull, like, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { Geohash } from '../domain/value-objects/Geohash';
import { addresses, customerLocationHistory, customers } from '../infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// ============================================================================
// GEOJSON EXPORT ENDPOINTS (for Apache Sedona / Spark)
// ============================================================================

/**
 * Export customers as GeoJSON FeatureCollection
 * Compatible with Apache Sedona: ST_GeomFromGeoJSON()
 */
app.get('/export/customers', async (c) => {
  const db = drizzle(c.env.DB);
  const format = c.req.query('format') || 'geojson'; // geojson | wkt | csv
  const status = c.req.query('status');
  const geohashPrefix = c.req.query('geohash'); // Filter by geohash prefix

  const conditions = [isNotNull(customers.lastKnownLatitude)];
  if (status) {
    conditions.push(eq(customers.status, status));
  }
  if (geohashPrefix) {
    conditions.push(like(customers.lastKnownGeohash, `${geohashPrefix}%`));
  }

  const records = await db
    .select()
    .from(customers)
    .where(and(...conditions))
    .all();

  if (format === 'wkt') {
    // WKT format for Sedona: ST_GeomFromWKT()
    const wktData = records.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      customer_type: r.customerType,
      status: r.status,
      total_orders: r.totalOrders,
      total_spent: r.totalSpent,
      geohash: r.lastKnownGeohash,
      wkt: `POINT(${r.lastKnownLongitude} ${r.lastKnownLatitude})`,
    }));
    return c.json({ format: 'wkt', count: wktData.length, data: wktData });
  }

  if (format === 'csv') {
    // CSV format for bulk import
    const escapeCsv = (value: string | null | undefined): string => {
      if (value == null) return '';
      const str = String(value);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const header =
      'id,code,name,customer_type,status,total_orders,total_spent,latitude,longitude,geohash';
    const rows = records.map(
      (r) =>
        `${r.id},${r.code},${escapeCsv(r.name)},${r.customerType},${r.status},${r.totalOrders},${r.totalSpent},${r.lastKnownLatitude},${r.lastKnownLongitude},${r.lastKnownGeohash}`
    );
    const csv = [header, ...rows].join('\n');
    return c.text(csv, 200, { 'Content-Type': 'text/csv' });
  }

  // GeoJSON FeatureCollection (default)
  const features = records.map((r) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [r.lastKnownLongitude, r.lastKnownLatitude],
    },
    properties: {
      id: r.id,
      code: r.code,
      name: r.name,
      customerType: r.customerType,
      status: r.status,
      totalOrders: r.totalOrders,
      totalSpent: r.totalSpent,
      geohash: r.lastKnownGeohash,
      membershipTier: r.membershipTier,
      loyaltyPoints: r.loyaltyPoints,
      creditLimit: r.creditLimit,
      creditUsed: r.creditUsed,
    },
  }));

  return c.json({
    type: 'FeatureCollection',
    features,
    metadata: {
      exportedAt: new Date().toISOString(),
      count: features.length,
      crs: { type: 'name', properties: { name: 'EPSG:4326' } },
    },
  });
});

/**
 * Export addresses as GeoJSON FeatureCollection
 */
app.get('/export/addresses', async (c) => {
  const db = drizzle(c.env.DB);
  const ownerType = c.req.query('ownerType'); // customer | supplier | employee
  const geohashPrefix = c.req.query('geohash');

  const conditions = [isNotNull(addresses.latitude)];
  if (ownerType) {
    conditions.push(eq(addresses.ownerType, ownerType));
  }
  if (geohashPrefix) {
    conditions.push(like(addresses.geohash, `${geohashPrefix}%`));
  }

  const records = await db
    .select()
    .from(addresses)
    .where(and(...conditions))
    .all();

  const features = records.map((r) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [r.longitude, r.latitude],
    },
    properties: {
      id: r.id,
      ownerType: r.ownerType,
      ownerId: r.ownerId,
      addressType: r.addressType,
      isPrimary: r.isPrimary,
      label: r.label,
      city: r.city,
      province: r.province,
      geohash: r.geohash,
      locationSource: r.locationSource,
      locationAccuracy: r.locationAccuracy,
    },
  }));

  return c.json({
    type: 'FeatureCollection',
    features,
    metadata: {
      exportedAt: new Date().toISOString(),
      count: features.length,
      crs: { type: 'name', properties: { name: 'EPSG:4326' } },
    },
  });
});

/**
 * Export location history as GeoJSON LineString (for route analysis)
 */
app.get('/export/location-history/:customerId', async (c) => {
  const customerId = c.req.param('customerId');
  const db = drizzle(c.env.DB);
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const conditions = [eq(customerLocationHistory.customerId, customerId)];
  if (startDate) {
    conditions.push(gte(customerLocationHistory.capturedAt, new Date(startDate).getTime()));
  }
  if (endDate) {
    conditions.push(lte(customerLocationHistory.capturedAt, new Date(endDate).getTime()));
  }

  const records = await db
    .select()
    .from(customerLocationHistory)
    .where(and(...conditions))
    .orderBy(customerLocationHistory.capturedAt)
    .all();

  // Create LineString for route visualization
  const coordinates = records.map((r) => [r.longitude, r.latitude, r.altitude || 0, r.capturedAt]);

  // Also create individual points with full metadata
  const points = records.map((r) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [r.longitude, r.latitude],
    },
    properties: {
      id: r.id,
      capturedAt: r.capturedAt,
      visitType: r.visitType,
      source: r.source,
      accuracy: r.accuracy,
      speed: r.speed,
      heading: r.heading,
      capturedBy: r.capturedBy,
      geohash: r.geohash,
    },
  }));

  // Build features array - only include LineString if we have at least 2 points
  const features: Array<{
    type: 'Feature';
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  }> = [];

  if (coordinates.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates.map((c) => [c[0], c[1]]),
      },
      properties: {
        customerId,
        pointCount: records.length,
        startTime: records[0]?.capturedAt ?? null,
        endTime: records[records.length - 1]?.capturedAt ?? null,
      },
    });
  }

  // Add individual points
  features.push(...points);

  return c.json({
    type: 'FeatureCollection',
    features,
    metadata: {
      exportedAt: new Date().toISOString(),
      customerId,
      pointCount: records.length,
    },
  });
});

/**
 * Export all location history for batch analysis (Apache Sedona)
 */
app.get('/export/location-history', async (c) => {
  const db = drizzle(c.env.DB);
  const visitType = c.req.query('visitType');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const limit = Number.parseInt(c.req.query('limit') || '10000');

  const conditions = [];
  if (visitType) {
    conditions.push(eq(customerLocationHistory.visitType, visitType));
  }
  if (startDate) {
    conditions.push(gte(customerLocationHistory.capturedAt, new Date(startDate).getTime()));
  }
  if (endDate) {
    conditions.push(lte(customerLocationHistory.capturedAt, new Date(endDate).getTime()));
  }

  let query = db.select().from(customerLocationHistory).$dynamic();
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const records = await query.limit(limit).all();

  const features = records.map((r) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [r.longitude, r.latitude],
    },
    properties: {
      id: r.id,
      customerId: r.customerId,
      capturedAt: r.capturedAt,
      visitType: r.visitType,
      source: r.source,
      accuracy: r.accuracy,
      geohash: r.geohash,
      capturedBy: r.capturedBy,
    },
  }));

  return c.json({
    type: 'FeatureCollection',
    features,
    metadata: {
      exportedAt: new Date().toISOString(),
      count: features.length,
      crs: { type: 'name', properties: { name: 'EPSG:4326' } },
    },
  });
});

// ============================================================================
// GEOSPATIAL QUERY ENDPOINTS (for D1 in-database analysis)
// ============================================================================

const clusterQuerySchema = z.object({
  geohashPrefix: z.string().min(1).max(8),
});

/**
 * Get customers clustered by geohash prefix
 * Useful for: heatmaps, regional analysis, delivery zone planning
 */
app.get('/clusters/customers', zValidator('query', clusterQuerySchema), async (c) => {
  const { geohashPrefix } = c.req.valid('query');
  const db = drizzle(c.env.DB);

  const records = await db
    .select()
    .from(customers)
    .where(
      and(
        isNotNull(customers.lastKnownGeohash),
        like(customers.lastKnownGeohash, `${geohashPrefix}%`)
      )
    )
    .all();

  // Group by sub-geohash (one character more precision)
  const clusters = new Map<string, { count: number; totalSpent: number; customers: string[] }>();

  for (const r of records) {
    const subHash = r.lastKnownGeohash?.substring(0, geohashPrefix.length + 1) || geohashPrefix;
    const existing = clusters.get(subHash) || { count: 0, totalSpent: 0, customers: [] };
    existing.count++;
    existing.totalSpent += r.totalSpent || 0;
    existing.customers.push(r.id);
    clusters.set(subHash, existing);
  }

  // Convert to GeoJSON for visualization
  const features = Array.from(clusters.entries()).map(([hash, data]) => {
    const geohash = Geohash.fromString(hash);
    const bounds = geohash.getBounds();
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [bounds.sw.lng, bounds.sw.lat],
            [bounds.ne.lng, bounds.sw.lat],
            [bounds.ne.lng, bounds.ne.lat],
            [bounds.sw.lng, bounds.ne.lat],
            [bounds.sw.lng, bounds.sw.lat],
          ],
        ],
      },
      properties: {
        geohash: hash,
        count: data.count,
        totalSpent: data.totalSpent,
        avgSpent: data.totalSpent / data.count,
        customerIds: data.customers,
      },
    };
  });

  return c.json({
    type: 'FeatureCollection',
    features,
    metadata: {
      geohashPrefix,
      precision: geohashPrefix.length + 1,
      clusterCount: clusters.size,
      totalCustomers: records.length,
    },
  });
});

const proximityQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(1).max(50000).default(1000),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Find customers near a location
 * Uses geohash prefix for efficient filtering, then Haversine for accuracy
 */
app.get('/nearby/customers', zValidator('query', proximityQuerySchema), async (c) => {
  const { latitude, longitude, radiusMeters, limit } = c.req.valid('query');
  const db = drizzle(c.env.DB);

  // Determine appropriate geohash precision for the radius
  const precision = radiusMeters > 5000 ? 4 : radiusMeters > 1000 ? 5 : radiusMeters > 150 ? 6 : 7;

  // Get geohashes to search (center + neighbors)
  const searchHashes = Geohash.withinRadius(latitude, longitude, radiusMeters, precision);

  // Query with geohash prefix filter
  const conditions = searchHashes.map((h) => like(customers.lastKnownGeohash, `${h}%`));

  // Use OR for multiple geohash prefixes
  const records = await db
    .select()
    .from(customers)
    .where(isNotNull(customers.lastKnownLatitude))
    .all();

  // Filter by geohash prefix in memory (D1 doesn't support OR well)
  const filtered = records.filter((r) =>
    searchHashes.some((h) => r.lastKnownGeohash?.startsWith(h))
  );

  // Calculate actual distances using Haversine
  const withDistance = filtered
    .map((r) => ({
      ...r,
      distance: haversineDistance(latitude, longitude, r.lastKnownLatitude!, r.lastKnownLongitude!),
    }))
    .filter((r) => r.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return c.json({
    center: { latitude, longitude },
    radiusMeters,
    count: withDistance.length,
    customers: withDistance.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      customerType: r.customerType,
      distance: Math.round(r.distance),
      latitude: r.lastKnownLatitude,
      longitude: r.lastKnownLongitude,
      geohash: r.lastKnownGeohash,
    })),
  });
});

// ============================================================================
// LOCATION CAPTURE ENDPOINT (for mobile app)
// ============================================================================

const captureLocationSchema = z.object({
  customerId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  source: z.enum(['gps', 'network', 'manual', 'checkin']),
  deviceId: z.string().optional(),
  visitType: z.enum(['sales_visit', 'delivery', 'survey', 'checkin']).optional(),
  visitNotes: z.string().optional(),
  photoUrl: z.string().optional(),
});

/**
 * Capture customer location from mobile app
 * Updates customer's last known location and adds to history
 */
app.post('/capture', zValidator('json', captureLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const capturedBy = c.req.header('x-user-id') || null;

  // Verify customer exists
  const customer = await db.select().from(customers).where(eq(customers.id, data.customerId)).get();
  if (!customer) {
    return c.json({ error: 'Customer not found' }, 404);
  }

  // Generate geohash
  const geohash = Geohash.encode(data.latitude, data.longitude, 7);
  const now = Date.now();

  // Generate GeoJSON point
  const geojson = JSON.stringify({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [data.longitude, data.latitude, data.altitude || 0],
    },
    properties: {
      accuracy: data.accuracy,
      source: data.source,
      capturedAt: now,
    },
  });

  // 1. Update customer's last known location
  await db
    .update(customers)
    .set({
      lastKnownLatitude: data.latitude,
      lastKnownLongitude: data.longitude,
      lastKnownGeohash: geohash.getValue(),
      lastLocationAccuracy: data.accuracy,
      lastLocationSource: data.source,
      lastLocationCapturedAt: now,
      lastLocationCapturedBy: capturedBy,
      updatedAt: now,
    })
    .where(eq(customers.id, data.customerId))
    .run();

  // 2. Add to location history
  const historyId = `loc-${now}-${Math.random().toString(36).substring(2, 11)}`;

  await db
    .insert(customerLocationHistory)
    .values({
      id: historyId,
      customerId: data.customerId,
      latitude: data.latitude,
      longitude: data.longitude,
      geohash: geohash.getValue(),
      accuracy: data.accuracy,
      altitude: data.altitude,
      speed: data.speed,
      heading: data.heading,
      source: data.source,
      capturedBy,
      deviceId: data.deviceId,
      visitType: data.visitType,
      visitNotes: data.visitNotes,
      photoUrl: data.photoUrl,
      geojson,
      capturedAt: now,
      createdAt: now,
    })
    .run();

  return c.json({
    success: true,
    locationId: historyId,
    geohash: geohash.getValue(),
    capturedAt: new Date(now).toISOString(),
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Haversine distance formula
 * Returns distance in meters between two lat/lng points
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default app;
