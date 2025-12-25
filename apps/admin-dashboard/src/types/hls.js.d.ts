declare module 'hls.js' {
  export interface HlsConfig {
    [key: string]: any;
  }

  export interface HlsEvent {
    type: string;
    [key: string]: any;
  }

  export interface HlsEventData {
    [key: string]: any;
  }

  export interface HlsLevel {
    height: number;
    bitrate: number;
    [key: string]: any;
  }

  export default class Hls {
    static isSupported(): boolean;
    static Events: {
      MANIFEST_PARSED: string;
      ERROR: string;
      [key: string]: string;
    };
    static ErrorTypes: {
      NETWORK_ERROR: string;
      MEDIA_ERROR: string;
      [key: string]: string;
    };

    levels: HlsLevel[];
    currentLevel: number;

    constructor(config?: HlsConfig);
    loadSource(src: string): void;
    attachMedia(media: HTMLMediaElement): void;
    on(event: string, callback: (event: HlsEvent, data: HlsEventData) => void): void;
    startLoad(): void;
    recoverMediaError(): void;
    destroy(): void;
  }
}
