import { io, Socket } from 'socket.io-client';
import { WebhookEvent, ClientConfig, ConnectionStatus } from '../shared/types';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

export class WebSocketClient {
    private socket: Socket | null = null;
    private config: ClientConfig;
    private status: ConnectionStatus;
    private reconnectAttempts: number = 0;
    private eventCallback?: (event: WebhookEvent) => void;
    private statusCallback?: (status: ConnectionStatus) => void;

    constructor(config: ClientConfig) {
        this.config = config;
        this.status = {
            connected: false,
            reconnectAttempts: 0,
            error: undefined
        };
    }

    setEventCallback(callback: (event: WebhookEvent) => void) {
        this.eventCallback = callback;
    }

    setStatusCallback(callback: (status: ConnectionStatus) => void) {
        this.statusCallback = callback;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                logger.info(`Connecting to ${this.config.serverUrl}...`);

                this.socket = io(this.config.serverUrl, {
                    reconnection: true,
                    reconnectionAttempts: this.config.maxRetries || 5,
                    reconnectionDelay: this.config.reconnectInterval || 1000,
                    timeout: 20000
                });

                this.socket.on('connect', () => {
                    this.status.connected = true;
                    this.status.lastConnected = new Date();
                    this.status.reconnectAttempts = 0;
                    this.status.error = undefined;

                    logger.info('Connected to server');
                    this.updateStatus();
                    resolve();
                });

                this.socket.on('disconnect', (reason: string) => {
                    this.status.connected = false;
                    this.status.error = reason;

                    logger.warn(`Disconnected from server: ${reason}`);
                    this.updateStatus();
                });

                this.socket.on('connect_error', (error: Error) => {
                    this.status.connected = false;
                    this.status.error = error.message;
                    this.reconnectAttempts++;

                    logger.error(`Connection error: ${error.message}`);
                    this.updateStatus();
                    reject(error);
                });

                this.socket.on('reconnect', (attemptNumber: number) => {
                    this.status.connected = true;
                    this.status.lastConnected = new Date();
                    this.status.reconnectAttempts = attemptNumber;
                    this.status.error = undefined;

                    logger.info(`Reconnected after ${attemptNumber} attempts`);
                    this.updateStatus();
                });

                this.socket.on('reconnect_attempt', (attemptNumber: number) => {
                    this.status.reconnectAttempts = attemptNumber;
                    logger.info(`Reconnection attempt ${attemptNumber}`);
                    this.updateStatus();
                });

                this.socket.on('reconnect_failed', () => {
                    this.status.connected = false;
                    this.status.error = 'Max reconnection attempts reached';

                    logger.error('Failed to reconnect after maximum attempts');
                    this.updateStatus();
                });

                this.socket.on('webhook', (event: WebhookEvent) => {
                    logger.info(`Received webhook event: ${event.id}`);
                    if (this.eventCallback) {
                        this.eventCallback(event);
                    }
                });

                this.socket.on('stats', (stats: any) => {
                    logger.info(`Server stats: ${stats.totalEvents} events, ${stats.activeConnections} connections`);
                });

                this.socket.on('pong', (data: any) => {
                    logger.debug(`Pong received: ${data.timestamp}`);
                });

            } catch (error) {
                logger.error(`Failed to create connection: ${error instanceof Error ? error.message : String(error)}`);
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.status.connected = false;
            this.updateStatus();
            logger.info('Disconnected from server');
        }
    }

    ping() {
        if (this.socket && this.status.connected) {
            this.socket.emit('ping');
        }
    }

    getStatus(): ConnectionStatus {
        return { ...this.status };
    }

    isConnected(): boolean {
        return this.status.connected;
    }

    private updateStatus() {
        if (this.statusCallback) {
            this.statusCallback({ ...this.status });
        }
    }
} 
