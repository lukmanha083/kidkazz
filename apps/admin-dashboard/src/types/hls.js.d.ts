declare module 'hls.js' {
  export default class Hls {
    static isSupported(): boolean;
    static Events: {
      MANIFEST_PARSED: string;
      ERROR: string;
    };
    static ErrorTypes: {
      NETWORK_ERROR: string;
      MEDIA_ERROR: string;
    };

    constructor(config?: any);
    loadSource(src: string): void;
    attachMedia(media: HTMLMediaElement): void;
    on(event: string, callback: (event: any, data: any) => void): void;
    startLoad(): void;
    recoverMediaError(): void;
    destroy(): void;
  }
}
