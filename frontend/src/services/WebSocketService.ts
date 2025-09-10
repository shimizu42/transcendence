export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Map<string, Function[]> = new Map();

  constructor(url: string = 'ws://localhost:3001/ws') {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, data: any): void {
    console.log('WebSocket: Sending message', { type, data });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.error('WebSocket: Cannot send message, connection not open', {
        readyState: this.ws?.readyState,
        connectionStatus: this.ws ? 'exists' : 'null'
      });
    }
  }

  on(type: string, handler: Function): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  off(type: string, handler: Function): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private handleMessage(message: { type: string; data: any }): void {
    console.log('WebSocket: Received message', message);
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      console.log(`WebSocket: Found ${handlers.length} handler(s) for message type: ${message.type}`);
      handlers.forEach(handler => handler(message.data));
    } else {
      console.warn(`WebSocket: No handlers found for message type: ${message.type}`);
    }
  }
}