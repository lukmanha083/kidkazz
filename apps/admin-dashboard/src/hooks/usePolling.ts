import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  interval?: number; // milliseconds, default 30000 (30 seconds)
  enabled?: boolean; // default true
}

/**
 * Custom hook for polling data updates
 *
 * Usage:
 * ```typescript
 * const { data, refetch } = useProducts();
 * usePolling(refetch, { interval: 30000 });
 * ```
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions = {}
) {
  const { interval = 30000, enabled = true } = options;
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up polling
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      savedCallback.current();
    };

    // Start polling
    intervalRef.current = setInterval(tick, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled]);
}
