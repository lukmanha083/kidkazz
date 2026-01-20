/**
 * WebSocket Connection Hook
 *
 * Manages WebSocket connections for real-time updates.
 * Automatically invalidates React Query cache when updates are received.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Subscription management
 * - Heartbeat/ping-pong to keep connection alive
 * - Integration with React Query for cache invalidation
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { queryKeys } from '../lib/query-client';

export type WebSocketType = 'inventory' | 'warehouses';

interface WebSocketMessage {
  type: string;
  data?: any;
  [key: string]: any;
}

interface UseWebSocketOptions {
  /**
   * Type of WebSocket connection
   */
  type: WebSocketType;

  /**
   * Subscription payload (e.g., productId, warehouseId)
   */
  subscription?: Record<string, any>;

  /**
   * Enable/disable connection
   */
  enabled?: boolean;

  /**
   * Custom message handler
   */
  onMessage?: (message: WebSocketMessage) => void;

  /**
   * Connection state change handler
   */
  onConnectionChange?: (connected: boolean) => void;

  /**
   * Base URL for inventory service
   */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'http://localhost:8792';
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    type,
    subscription,
    enabled = true,
    onMessage,
    onConnectionChange,
    baseUrl = DEFAULT_BASE_URL,
  } = options;

  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Call custom handler if provided
        if (onMessage) {
          onMessage(message);
        }

        // Handle specific message types
        switch (message.type) {
          case 'inventory_adjusted':
          case 'inventory_updated':
            // Invalidate inventory queries to trigger refetch
            queryClient.invalidateQueries({
              queryKey: queryKeys.inventory.all,
            });
            break;

          case 'stock_low':
            // Invalidate specific inventory item
            if (message.data?.productId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.inventory.detail(
                  message.data.productId,
                  message.data.warehouseId
                ),
              });
            }
            break;

          case 'warehouse_created':
          case 'warehouse_updated':
          case 'warehouse_deleted':
            // Invalidate warehouse queries to trigger refetch
            queryClient.invalidateQueries({
              queryKey: queryKeys.warehouses.all,
            });
            break;

          case 'connected':
          case 'subscribed':
          case 'unsubscribed':
          case 'pong':
            // Info messages - no action needed
            console.log(`WebSocket: ${message.type}`, message);
            break;

          case 'error':
            console.error('WebSocket error:', message.message);
            break;

          default:
            console.warn('Unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
    [onMessage, queryClient]
  );

  /**
   * Send message to WebSocket
   */
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  /**
   * Subscribe to updates
   */
  const subscribe = useCallback(() => {
    if (subscription) {
      send({
        type: 'subscribe',
        payload: subscription,
      });
    }
  }, [subscription, send]);

  /**
   * Send heartbeat to keep connection alive
   */
  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      send({ type: 'ping' });
    }, HEARTBEAT_INTERVAL);
  }, [send]);

  /**
   * Stop heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!enabled) return;

    // Determine WebSocket URL based on type
    const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/ws/${type}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`WebSocket connected: ${type}`);
        setIsConnected(true);
        onConnectionChange?.(true);
        reconnectAttemptRef.current = 0; // Reset reconnect attempts

        // Subscribe to updates
        subscribe();

        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error(`WebSocket error (${type}):`, error);
      };

      ws.onclose = () => {
        console.log(`WebSocket closed: ${type}`);
        setIsConnected(false);
        onConnectionChange?.(false);
        stopHeartbeat();

        // Attempt to reconnect with exponential backoff
        if (enabled) {
          const delay =
            RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
          console.log(`Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error(`Failed to create WebSocket (${type}):`, error);
    }
  }, [
    enabled,
    type,
    baseUrl,
    handleMessage,
    subscribe,
    startHeartbeat,
    stopHeartbeat,
    onConnectionChange,
  ]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, [stopHeartbeat]);

  /**
   * Connect on mount, disconnect on unmount
   */
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  /**
   * Update subscription when it changes
   */
  useEffect(() => {
    if (isConnected && subscription) {
      subscribe();
    }
  }, [subscription, isConnected, subscribe]);

  return {
    isConnected,
    send,
    disconnect,
    reconnect: connect,
  };
}
