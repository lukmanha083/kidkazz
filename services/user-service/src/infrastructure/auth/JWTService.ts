import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

export interface TokenPayload {
  userId: string;
  email: string;
  userType: 'retail' | 'wholesale' | 'admin';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  constructor(
    private readonly secret: string,
    private readonly accessTokenExpiry: string = '1h',
    private readonly refreshTokenExpiry: string = '7d'
  ) {}

  /**
   * Generate access and refresh tokens
   */
  async generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    // Parse expiry string to seconds
    const expiresIn = this.parseExpiry(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Generate access token (short-lived)
   */
  async generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
    const expiry = this.parseExpiry(this.accessTokenExpiry);
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiry,
    };

    return sign(tokenPayload, this.secret);
  }

  /**
   * Generate refresh token (long-lived)
   */
  async generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
    const expiry = this.parseExpiry(this.refreshTokenExpiry);
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiry,
    };

    return sign(tokenPayload, this.secret);
  }

  /**
   * Verify and decode token
   */
  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const isValid = await verify(token, this.secret);
      if (!isValid) {
        return null;
      }

      // Decode without verification (we already verified)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      return payload as TokenPayload;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Parse expiry string to seconds
   * Supports: 1h, 30m, 7d, 24h, etc.
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's': // seconds
        return value;
      case 'm': // minutes
        return value * 60;
      case 'h': // hours
        return value * 60 * 60;
      case 'd': // days
        return value * 24 * 60 * 60;
      default:
        throw new Error(`Invalid expiry format: ${expiry}`);
    }
  }
}
