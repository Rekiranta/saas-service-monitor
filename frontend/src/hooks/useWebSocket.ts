import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage, HealthStatus } from '../types';

interface UseWebSocketOptions {
  onStatusUpdate?: (
    serviceId: string,
    environmentId: string,
    status: HealthStatus,
    responseTimeMs: number,
    timestamp: string
  ) => void;
}

export function useWebSocket({ onStatusUpdate }: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const subscribedServicesRef = useRef<Set<string>>(new Set());
  const subscribedEnvironmentsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      // Re-subscribe to all previously subscribed services and environments
      subscribedServicesRef.current.forEach((serviceId) => {
        ws.send(JSON.stringify({ type: 'subscribe', service_id: serviceId }));
      });
      subscribedEnvironmentsRef.current.forEach((envId) => {
        ws.send(JSON.stringify({ type: 'subscribe', environment_id: envId }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (
          message.type === 'status_update' &&
          message.service_id &&
          message.environment_id &&
          message.status &&
          onStatusUpdate
        ) {
          onStatusUpdate(
            message.service_id,
            message.environment_id,
            message.status,
            message.response_time_ms || 0,
            message.timestamp || new Date().toISOString()
          );
        }
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [onStatusUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const subscribeToService = useCallback((serviceId: string) => {
    subscribedServicesRef.current.add(serviceId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', service_id: serviceId }));
    }
  }, []);

  const unsubscribeFromService = useCallback((serviceId: string) => {
    subscribedServicesRef.current.delete(serviceId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', service_id: serviceId }));
    }
  }, []);

  const subscribeToEnvironment = useCallback((environmentId: string) => {
    subscribedEnvironmentsRef.current.add(environmentId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', environment_id: environmentId }));
    }
  }, []);

  const unsubscribeFromEnvironment = useCallback((environmentId: string) => {
    subscribedEnvironmentsRef.current.delete(environmentId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', environment_id: environmentId }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    subscribeToService,
    unsubscribeFromService,
    subscribeToEnvironment,
    unsubscribeFromEnvironment,
  };
}
