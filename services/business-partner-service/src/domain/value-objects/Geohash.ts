/**
 * Geohash Value Object
 * Encodes latitude/longitude into a compact string for efficient spatial indexing
 *
 * Precision levels:
 * - 1 char: ±2500km (global)
 * - 4 chars: ±20km (city)
 * - 5 chars: ±2.4km (neighborhood)
 * - 6 chars: ±610m (street)
 * - 7 chars: ±76m (building) - DEFAULT
 * - 8 chars: ±19m (precise)
 * - 9 chars: ±2.4m (very precise)
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE32_MAP: Record<string, number> = {};
for (let i = 0; i < BASE32.length; i++) {
  BASE32_MAP[BASE32[i]] = i;
}

export interface GeohashBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

export interface GeohashNeighbors {
  n: string;
  ne: string;
  e: string;
  se: string;
  s: string;
  sw: string;
  w: string;
  nw: string;
}

export class Geohash {
  private readonly value: string;
  private readonly latitude: number;
  private readonly longitude: number;

  private constructor(value: string, latitude: number, longitude: number) {
    this.value = value;
    this.latitude = latitude;
    this.longitude = longitude;
  }

  /**
   * Create a Geohash from latitude and longitude
   * @param latitude - Latitude (-90 to 90)
   * @param longitude - Longitude (-180 to 180)
   * @param precision - Number of characters (1-12), default 7 (~76m accuracy)
   */
  public static encode(latitude: number, longitude: number, precision = 7): Geohash {
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    if (precision < 1 || precision > 12) {
      throw new Error('Precision must be between 1 and 12');
    }

    let latMin = -90;
    let latMax = 90;
    let lngMin = -180;
    let lngMax = 180;

    let hash = '';
    let bit = 0;
    let ch = 0;
    let isEven = true;

    while (hash.length < precision) {
      if (isEven) {
        const mid = (lngMin + lngMax) / 2;
        if (longitude >= mid) {
          ch |= 1 << (4 - bit);
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (latitude >= mid) {
          ch |= 1 << (4 - bit);
          latMin = mid;
        } else {
          latMax = mid;
        }
      }

      isEven = !isEven;
      bit++;

      if (bit === 5) {
        hash += BASE32[ch];
        bit = 0;
        ch = 0;
      }
    }

    return new Geohash(hash, latitude, longitude);
  }

  /**
   * Decode a geohash string to latitude/longitude
   */
  public static decode(geohash: string): {
    latitude: number;
    longitude: number;
    error: { lat: number; lng: number };
  } {
    if (!geohash || geohash.trim() === '') {
      throw new Error('Invalid geohash: empty string');
    }
    const normalized = geohash.toLowerCase();

    let latMin = -90;
    let latMax = 90;
    let lngMin = -180;
    let lngMax = 180;
    let isEven = true;

    for (const char of normalized) {
      const cd = BASE32_MAP[char];
      if (cd === undefined) {
        throw new Error(`Invalid geohash character: ${char}`);
      }

      for (let bit = 4; bit >= 0; bit--) {
        const mask = 1 << bit;
        if (isEven) {
          if (cd & mask) {
            lngMin = (lngMin + lngMax) / 2;
          } else {
            lngMax = (lngMin + lngMax) / 2;
          }
        } else {
          if (cd & mask) {
            latMin = (latMin + latMax) / 2;
          } else {
            latMax = (latMin + latMax) / 2;
          }
        }
        isEven = !isEven;
      }
    }

    return {
      latitude: (latMin + latMax) / 2,
      longitude: (lngMin + lngMax) / 2,
      error: {
        lat: (latMax - latMin) / 2,
        lng: (lngMax - lngMin) / 2,
      },
    };
  }

  /**
   * Get the bounding box for a geohash
   */
  public static bounds(geohash: string): GeohashBounds {
    const normalized = geohash.toLowerCase();

    let latMin = -90;
    let latMax = 90;
    let lngMin = -180;
    let lngMax = 180;
    let isEven = true;

    for (const char of normalized) {
      const cd = BASE32_MAP[char];
      if (cd === undefined) {
        throw new Error(`Invalid geohash character: ${char}`);
      }

      for (let bit = 4; bit >= 0; bit--) {
        const mask = 1 << bit;
        if (isEven) {
          if (cd & mask) {
            lngMin = (lngMin + lngMax) / 2;
          } else {
            lngMax = (lngMin + lngMax) / 2;
          }
        } else {
          if (cd & mask) {
            latMin = (latMin + latMax) / 2;
          } else {
            latMax = (latMin + latMax) / 2;
          }
        }
        isEven = !isEven;
      }
    }

    return {
      sw: { lat: latMin, lng: lngMin },
      ne: { lat: latMax, lng: lngMax },
    };
  }

  /**
   * Get all 8 neighboring geohashes
   */
  public static neighbors(geohash: string): GeohashNeighbors {
    const { latitude, longitude, error } = Geohash.decode(geohash);
    const precision = geohash.length;

    const latStep = error.lat * 2;
    const lngStep = error.lng * 2;

    // Clamp latitude to valid range (-90 to 90)
    const clampLat = (lat: number): number => Math.max(-90, Math.min(90, lat));

    // Wrap longitude to valid range (-180 to 180)
    const wrapLng = (lng: number): number => {
      let result = lng;
      while (result > 180) result -= 360;
      while (result < -180) result += 360;
      return result;
    };

    return {
      n: Geohash.encode(clampLat(latitude + latStep), longitude, precision).getValue(),
      ne: Geohash.encode(
        clampLat(latitude + latStep),
        wrapLng(longitude + lngStep),
        precision
      ).getValue(),
      e: Geohash.encode(latitude, wrapLng(longitude + lngStep), precision).getValue(),
      se: Geohash.encode(
        clampLat(latitude - latStep),
        wrapLng(longitude + lngStep),
        precision
      ).getValue(),
      s: Geohash.encode(clampLat(latitude - latStep), longitude, precision).getValue(),
      sw: Geohash.encode(
        clampLat(latitude - latStep),
        wrapLng(longitude - lngStep),
        precision
      ).getValue(),
      w: Geohash.encode(latitude, wrapLng(longitude - lngStep), precision).getValue(),
      nw: Geohash.encode(
        clampLat(latitude + latStep),
        wrapLng(longitude - lngStep),
        precision
      ).getValue(),
    };
  }

  /**
   * Get geohashes within a radius (for proximity queries)
   * Returns the center geohash plus neighbors if needed
   */
  public static withinRadius(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    precision = 7
  ): string[] {
    const centerHash = Geohash.encode(latitude, longitude, precision).getValue();

    // If radius is small enough to fit in single cell, return just center
    const cellSize = Geohash.getCellSizeMeters(precision);
    if (radiusMeters <= cellSize / 2) {
      return [centerHash];
    }

    // Include neighbors for larger radius
    const neighbors = Geohash.neighbors(centerHash);
    return [
      centerHash,
      neighbors.n,
      neighbors.ne,
      neighbors.e,
      neighbors.se,
      neighbors.s,
      neighbors.sw,
      neighbors.w,
      neighbors.nw,
    ];
  }

  /**
   * Get approximate cell size in meters for a given precision
   */
  public static getCellSizeMeters(precision: number): number {
    // Approximate cell sizes at equator
    const sizes: Record<number, number> = {
      1: 5000000,
      2: 1250000,
      3: 156000,
      4: 39100,
      5: 4890,
      6: 1220,
      7: 153,
      8: 38,
      9: 4.8,
      10: 1.2,
      11: 0.15,
      12: 0.037,
    };
    return sizes[precision] || 153;
  }

  /**
   * Reconstitute from existing geohash string
   */
  public static fromString(geohash: string): Geohash {
    const decoded = Geohash.decode(geohash);
    return new Geohash(geohash, decoded.latitude, decoded.longitude);
  }

  // Instance methods
  public getValue(): string {
    return this.value;
  }

  public getLatitude(): number {
    return this.latitude;
  }

  public getLongitude(): number {
    return this.longitude;
  }

  public getPrecision(): number {
    return this.value.length;
  }

  public getBounds(): GeohashBounds {
    return Geohash.bounds(this.value);
  }

  public getNeighbors(): GeohashNeighbors {
    return Geohash.neighbors(this.value);
  }

  /**
   * Check if this geohash contains another (prefix match)
   */
  public contains(other: string): boolean {
    return other.startsWith(this.value);
  }

  /**
   * Get parent geohash (less precise)
   */
  public parent(): Geohash | null {
    if (this.value.length <= 1) return null;
    return Geohash.fromString(this.value.slice(0, -1));
  }

  /**
   * Convert to GeoJSON Point
   */
  public toGeoJSON(): {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { geohash: string; precision: number };
  } {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [this.longitude, this.latitude],
      },
      properties: {
        geohash: this.value,
        precision: this.value.length,
      },
    };
  }

  /**
   * Convert bounds to GeoJSON Polygon
   */
  public boundsToGeoJSON(): {
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: [
        [[number, number], [number, number], [number, number], [number, number], [number, number]],
      ];
    };
    properties: { geohash: string };
  } {
    const bounds = this.getBounds();
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
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
        geohash: this.value,
      },
    };
  }
}
