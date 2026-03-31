import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '@/api/axiosConfig';

class SocketService {
  private socket: Socket | null = null;

  /** Connect the socket and join the patient room */
  connect(userId: string, accessToken: string) {
    if (this.socket?.connected) return;

    console.log('[Socket] Connecting to:', SOCKET_BASE_URL);
    this.socket = io(SOCKET_BASE_URL, {
      path: '/socket.io', // Ensure standard socket.io path
      transports: ['websocket', 'polling'], // Prioritize websocket for speed
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 30000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Join patient-specific room so backend can target this user
      this.socket?.emit('join_room', {
        role: 'patient',
        userId,
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.log('[Socket] Connection error:', err.message);
    });
  }

  /** Disconnect and clean up */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[Socket] Manually disconnected');
    }
  }

  /** Subscribe to an event, returns unsubscribe function */
  on<T = any>(event: string, callback: (data: T) => void): () => void {
    this.socket?.on(event, callback);
    return () => this.socket?.off(event, callback);
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
