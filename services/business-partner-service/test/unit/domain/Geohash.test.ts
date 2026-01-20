import { describe, expect, it } from 'vitest';
import { Geohash } from '../../../src/domain/value-objects/Geohash';

describe('Geohash', () => {
  describe('encode', () => {
    it('should encode Jakarta coordinates to geohash', () => {
      // Jakarta: -6.2088, 106.8456
      const geohash = Geohash.encode(-6.2088, 106.8456, 7);
      expect(geohash.getValue()).toHaveLength(7);
      expect(geohash.getValue()).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]+$/);
    });

    it('should encode with different precisions', () => {
      const lat = -6.2088;
      const lng = 106.8456;

      const hash4 = Geohash.encode(lat, lng, 4);
      const hash7 = Geohash.encode(lat, lng, 7);
      const hash9 = Geohash.encode(lat, lng, 9);

      expect(hash4.getValue()).toHaveLength(4);
      expect(hash7.getValue()).toHaveLength(7);
      expect(hash9.getValue()).toHaveLength(9);

      // Longer hash should start with shorter hash
      expect(hash7.getValue().startsWith(hash4.getValue())).toBe(true);
      expect(hash9.getValue().startsWith(hash7.getValue())).toBe(true);
    });

    it('should throw error for invalid latitude', () => {
      expect(() => Geohash.encode(-91, 106)).toThrow('Latitude must be between -90 and 90');
      expect(() => Geohash.encode(91, 106)).toThrow('Latitude must be between -90 and 90');
    });

    it('should throw error for invalid longitude', () => {
      expect(() => Geohash.encode(-6, -181)).toThrow('Longitude must be between -180 and 180');
      expect(() => Geohash.encode(-6, 181)).toThrow('Longitude must be between -180 and 180');
    });

    it('should throw error for invalid precision', () => {
      expect(() => Geohash.encode(-6, 106, 0)).toThrow('Precision must be between 1 and 12');
      expect(() => Geohash.encode(-6, 106, 13)).toThrow('Precision must be between 1 and 12');
    });
  });

  describe('decode', () => {
    it('should decode geohash back to coordinates', () => {
      const original = { lat: -6.2088, lng: 106.8456 };
      const geohash = Geohash.encode(original.lat, original.lng, 7);
      const decoded = Geohash.decode(geohash.getValue());

      // Should be within error margin
      expect(Math.abs(decoded.latitude - original.lat)).toBeLessThan(decoded.error.lat * 2);
      expect(Math.abs(decoded.longitude - original.lng)).toBeLessThan(decoded.error.lng * 2);
    });

    it('should return smaller error for higher precision', () => {
      const hash4 = Geohash.encode(-6.2088, 106.8456, 4);
      const hash7 = Geohash.encode(-6.2088, 106.8456, 7);

      const decoded4 = Geohash.decode(hash4.getValue());
      const decoded7 = Geohash.decode(hash7.getValue());

      expect(decoded7.error.lat).toBeLessThan(decoded4.error.lat);
      expect(decoded7.error.lng).toBeLessThan(decoded4.error.lng);
    });

    it('should throw error for invalid geohash characters', () => {
      expect(() => Geohash.decode('abc123!')).toThrow('Invalid geohash character');
      expect(() => Geohash.decode('abcABC')).toThrow('Invalid geohash character'); // uppercase A
    });
  });

  describe('bounds', () => {
    it('should return bounding box for geohash', () => {
      const geohash = Geohash.encode(-6.2088, 106.8456, 5);
      const bounds = Geohash.bounds(geohash.getValue());

      expect(bounds.sw.lat).toBeLessThan(bounds.ne.lat);
      expect(bounds.sw.lng).toBeLessThan(bounds.ne.lng);

      // Original point should be inside bounds
      expect(-6.2088).toBeGreaterThanOrEqual(bounds.sw.lat);
      expect(-6.2088).toBeLessThanOrEqual(bounds.ne.lat);
      expect(106.8456).toBeGreaterThanOrEqual(bounds.sw.lng);
      expect(106.8456).toBeLessThanOrEqual(bounds.ne.lng);
    });
  });

  describe('neighbors', () => {
    it('should return 8 neighboring geohashes', () => {
      const geohash = Geohash.encode(-6.2088, 106.8456, 5);
      const neighbors = Geohash.neighbors(geohash.getValue());

      expect(neighbors.n).toBeDefined();
      expect(neighbors.ne).toBeDefined();
      expect(neighbors.e).toBeDefined();
      expect(neighbors.se).toBeDefined();
      expect(neighbors.s).toBeDefined();
      expect(neighbors.sw).toBeDefined();
      expect(neighbors.w).toBeDefined();
      expect(neighbors.nw).toBeDefined();

      // All neighbors should have same length
      expect(neighbors.n.length).toBe(5);
      expect(neighbors.e.length).toBe(5);
    });

    it('should return different geohashes for each direction', () => {
      const geohash = Geohash.encode(-6.2088, 106.8456, 5);
      const neighbors = Geohash.neighbors(geohash.getValue());
      const center = geohash.getValue();

      const all = new Set([
        center,
        neighbors.n,
        neighbors.ne,
        neighbors.e,
        neighbors.se,
        neighbors.s,
        neighbors.sw,
        neighbors.w,
        neighbors.nw,
      ]);

      expect(all.size).toBe(9); // All unique
    });
  });

  describe('withinRadius', () => {
    it('should return only center for small radius', () => {
      const hashes = Geohash.withinRadius(-6.2088, 106.8456, 10, 7);
      expect(hashes.length).toBe(1);
    });

    it('should return center + neighbors for larger radius', () => {
      const hashes = Geohash.withinRadius(-6.2088, 106.8456, 500, 7);
      expect(hashes.length).toBe(9);
    });
  });

  describe('getCellSizeMeters', () => {
    it('should return approximate cell sizes', () => {
      expect(Geohash.getCellSizeMeters(7)).toBe(153);
      expect(Geohash.getCellSizeMeters(5)).toBe(4890);
      expect(Geohash.getCellSizeMeters(9)).toBe(4.8);
    });
  });

  describe('instance methods', () => {
    it('should provide getters', () => {
      const geohash = Geohash.encode(-6.2088, 106.8456, 7);

      expect(geohash.getValue()).toHaveLength(7);
      expect(geohash.getLatitude()).toBeCloseTo(-6.2088, 2);
      expect(geohash.getLongitude()).toBeCloseTo(106.8456, 2);
      expect(geohash.getPrecision()).toBe(7);
    });

    it('should check containment', () => {
      const parent = Geohash.encode(-6.2088, 106.8456, 4);
      const child = Geohash.encode(-6.2088, 106.8456, 7);

      expect(parent.contains(child.getValue())).toBe(true);
      expect(child.contains(parent.getValue())).toBe(false);
    });

    it('should get parent geohash', () => {
      const geohash = Geohash.encode(-6.2088, 106.8456, 7);
      const parent = geohash.parent();

      expect(parent).not.toBeNull();
      expect(parent!.getPrecision()).toBe(6);
      expect(geohash.getValue().startsWith(parent!.getValue())).toBe(true);
    });

    it('should return null for single-char geohash parent', () => {
      const geohash = Geohash.encode(-6.2088, 106.8456, 1);
      expect(geohash.parent()).toBeNull();
    });
  });

  describe('toGeoJSON', () => {
    it('should convert to GeoJSON Point', () => {
      const geohash = Geohash.encode(-6.2088, 106.8456, 7);
      const geojson = geohash.toGeoJSON();

      expect(geojson.type).toBe('Feature');
      expect(geojson.geometry.type).toBe('Point');
      expect(geojson.geometry.coordinates[0]).toBeCloseTo(106.8456, 2); // lng
      expect(geojson.geometry.coordinates[1]).toBeCloseTo(-6.2088, 2); // lat
      expect(geojson.properties.geohash).toBe(geohash.getValue());
    });

    it('should convert bounds to GeoJSON Polygon', () => {
      const geohash = Geohash.encode(-6.2088, 106.8456, 5);
      const geojson = geohash.boundsToGeoJSON();

      expect(geojson.type).toBe('Feature');
      expect(geojson.geometry.type).toBe('Polygon');
      expect(geojson.geometry.coordinates[0]).toHaveLength(5); // Closed polygon
      expect(geojson.properties.geohash).toBe(geohash.getValue());
    });
  });

  describe('fromString', () => {
    it('should reconstitute from geohash string', () => {
      const original = Geohash.encode(-6.2088, 106.8456, 7);
      const reconstituted = Geohash.fromString(original.getValue());

      expect(reconstituted.getValue()).toBe(original.getValue());
      // Decoded coordinates are center of geohash cell, so use precision 2 (~0.01 degree tolerance)
      expect(reconstituted.getLatitude()).toBeCloseTo(original.getLatitude(), 2);
      expect(reconstituted.getLongitude()).toBeCloseTo(original.getLongitude(), 2);
    });
  });
});
