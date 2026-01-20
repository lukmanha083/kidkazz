/**
 * Video Player Component
 *
 * Features:
 * - HLS adaptive streaming (for Cloudflare Stream)
 * - Basic HTML5 video (for R2 mode)
 * - Automatic quality selection
 * - Manual quality selector
 * - Playback controls (play, pause, seek, volume, fullscreen)
 * - Thumbnail preview
 * - Loading states
 * - Error handling
 */

import {
  AlertCircle,
  Loader2,
  Maximize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface VideoUrls {
  original?: string; // R2 mode
  hls?: string; // Stream mode (HLS)
  dash?: string; // Stream mode (DASH)
  thumbnail?: string; // Stream thumbnail
  download?: string;
}

interface VideoPlayerProps {
  urls: VideoUrls;
  mode: 'r2' | 'stream';
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onError?: (error: string) => void;
}

/**
 * Renders a customizable video player that supports basic R2 playback and HLS adaptive streaming.
 *
 * Supports autoplay, mute, native/custom controls, quality selection (stream mode), fullscreen, seeking,
 * and exposes loading and error states via an optional error callback.
 *
 * @param urls - Object containing optional source URLs: `original` (R2), `hls` (HLS manifest), `dash`, `thumbnail`, and `download`.
 * @param mode - Playback mode: `"r2"` for basic video via `urls.original` or `"stream"` for HLS adaptive playback via `urls.hls`.
 * @param autoplay - Whether playback should start automatically.
 * @param muted - Initial muted state for the player.
 * @param controls - Whether to show the custom control UI (play/pause, volume, seek, quality, fullscreen).
 * @param className - Optional additional CSS classes applied to the player container.
 * @param onError - Optional callback invoked with a short error message when player initialization or playback fails.
 * @returns The video player React element.
 */
export function VideoPlayer({
  urls,
  mode,
  autoplay = false,
  muted = false,
  controls = true,
  className = '',
  onError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hls, setHls] = useState<any>(null);
  const [qualities, setQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  /**
   * Initialize HLS.js for Stream mode
   */
  useEffect(() => {
    if (mode !== 'stream' || !urls.hls) return;

    const loadHls = async () => {
      try {
        // Dynamically import HLS.js
        const Hls = (await import('hls.js')).default;

        if (!Hls.isSupported()) {
          // Fallback to native HLS support (Safari)
          if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = urls.hls!;
            setIsLoading(false);
            return;
          }

          const errorMsg = 'HLS is not supported in this browser';
          setError(errorMsg);
          onError?.(errorMsg);
          return;
        }

        // Initialize HLS.js
        const hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hlsInstance.loadSource(urls.hls!);
        hlsInstance.attachMedia(videoRef.current!);

        // Handle HLS events
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest loaded');
          setIsLoading(false);

          // Get available qualities
          const levels = hlsInstance.levels.map((level: any) => `${level.height}p`);
          setQualities(['auto', ...levels]);

          // Autoplay if enabled
          if (autoplay) {
            videoRef.current?.play();
          }
        });

        hlsInstance.on(Hls.Events.ERROR, (_event: any, data: any) => {
          console.error('HLS error:', data);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, trying to recover...');
                hlsInstance.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, trying to recover...');
                hlsInstance.recoverMediaError();
                break;
              default: {
                const errorMsg = 'Fatal HLS error, cannot recover';
                setError(errorMsg);
                onError?.(errorMsg);
                break;
              }
            }
          }
        });

        setHls(hlsInstance);

        // Cleanup
        return () => {
          hlsInstance.destroy();
        };
      } catch (err) {
        const errorMsg = 'Failed to load video player';
        setError(errorMsg);
        onError?.(errorMsg);
        console.error('HLS initialization error:', err);
      }
    };

    loadHls();
  }, [urls.hls, mode, autoplay, onError]);

  /**
   * Initialize basic video for R2 mode
   */
  useEffect(() => {
    if (mode !== 'r2' || !urls.original) return;

    if (videoRef.current) {
      videoRef.current.src = urls.original;
      setIsLoading(false);
    }
  }, [urls.original, mode]);

  /**
   * Handle video events
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      const errorMsg = 'Failed to load video';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsLoading(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [onError]);

  /**
   * Toggle play/pause
   */
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  /**
   * Toggle mute
   */
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
  };

  /**
   * Handle volume change
   */
  const handleVolumeChange = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = value;
    if (value === 0) {
      videoRef.current.muted = true;
    } else if (isMuted) {
      videoRef.current.muted = false;
    }
  };

  /**
   * Handle seek
   */
  const handleSeek = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value;
  };

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  /**
   * Change quality (Stream mode only)
   */
  const changeQuality = (quality: string) => {
    if (!hls) return;

    if (quality === 'auto') {
      hls.currentLevel = -1; // Auto quality
    } else {
      const levelIndex = hls.levels.findIndex((level: any) => `${level.height}p` === quality);
      if (levelIndex !== -1) {
        hls.currentLevel = levelIndex;
      }
    }

    setCurrentQuality(quality);
    setShowQualityMenu(false);
  };

  /**
   * Format time (seconds to MM:SS)
   */
  const formatTime = (seconds: number): string => {
    if (Number.isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        autoPlay={autoplay}
        muted={muted}
        playsInline
        poster={urls.thumbnail}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-white text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      {controls && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => handleSeek(Number.parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 text-white hover:bg-white/20 rounded-full transition"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number.parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quality Selector (Stream mode only) */}
              {mode === 'stream' && qualities.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="p-2 text-white hover:bg-white/20 rounded-full transition"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-lg py-2 min-w-[120px]">
                      {qualities.map((quality) => (
                        <button
                          type="button"
                          key={quality}
                          onClick={() => changeQuality(quality)}
                          className={`w-full px-4 py-2 text-left text-white hover:bg-white/20 transition ${
                            currentQuality === quality ? 'bg-blue-500/30' : ''
                          }`}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 text-white hover:bg-white/20 rounded-full transition"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Badge */}
      <div className="absolute top-2 right-2">
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            mode === 'stream' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
          }`}
        >
          {mode === 'stream' ? 'Adaptive Streaming' : 'Basic Video'}
        </div>
      </div>
    </div>
  );
}
