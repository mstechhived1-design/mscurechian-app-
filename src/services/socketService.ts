import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '@/api/axiosConfig';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private lastUserId: string | null = null;
  private lastToken: string | null = null;

  /** Connect the socket and join the patient room */
  connect(userId: string, accessToken: string) {
    this.lastUserId = userId;
    this.lastToken = accessToken;

    if (this.socket?.connected) return;

    if (!this.socket) {
      console.log('[Socket] Connecting to:', SOCKET_BASE_URL);
      this.socket = io(SOCKET_BASE_URL, {
        path: '/socket.io', // Ensure standard socket.io path
        transports: ['websocket', 'polling'], // Prioritize websocket for speed
        auth: { token: accessToken },
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 2000,
        timeout: 30000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected:', this.socket?.id);
        // Re-attach all registered listeners onto the socket
        this.listeners.forEach((cbs, event) => {
          cbs.forEach((cb) => {
            this.socket?.off(event, cb);
            this.socket?.on(event, cb);
          });
        });

        // Join patient-specific room so backend can target this user
        if (this.lastUserId) {
          this.socket?.emit('join_room', {
            role: 'patient',
            userId: this.lastUserId,
          });
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      this.socket.on('connect_error', (err) => {
        console.log('[Socket] Connection error:', err.message);
      });
    } else if (!this.socket.connected) {
      this.socket.auth = { token: accessToken };
      this.socket.connect();
    }
  }

  /** Disconnect and clean up */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[Socket] Manually disconnected');
    }
  }

  /** Subscribe to an event, returns unsubscribe function. Survives reconnects and pre-connect calls. */
  on<T = any>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => {
      this.listeners.get(event)?.delete(callback);
      if (this.listeners.get(event)?.size === 0) {
        this.listeners.delete(event);
      }
      this.socket?.off(event, callback);
    };
  }

  /** Emit an event to the server */
  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton — one socket for the whole app
export const socketService = new SocketService();
