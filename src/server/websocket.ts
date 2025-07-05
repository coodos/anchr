import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { WebhookEvent, ServerStats } from '../shared/types';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

export class WebSocketServer {
    private io: SocketIOServer;
    private stats: ServerStats;
    private startTime: Date;

    constructor(httpServer: HTTPServer) {
        this.startTime = new Date();
        this.stats = {
            totalEvents: 0,
            activeConnections: 0,
            uptime: 0
        };

        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.setupEventHandlers();
        this.startStatsUpdate();
    }

    private setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.stats.activeConnections++;
            logger.info('Client connected', {
                socketId: socket.id,
                activeConnections: this.stats.activeConnections
            });

            // Send current stats to new client
            socket.emit('stats', this.getStats());

            socket.on('disconnect', () => {
                this.stats.activeConnections--;
                logger.info('Client disconnected', {
                    socketId: socket.id,
                    activeConnections: this.stats.activeConnections
                });
            });

            socket.on('ping', () => {
                socket.emit('pong', { timestamp: new Date().toISOString() });
            });
        });
    }

    private startStatsUpdate() {
        setInterval(() => {
            this.stats.uptime = Date.now() - this.startTime.getTime();
        }, 1000);
    }

    broadcastEvent(event: WebhookEvent) {
        this.stats.totalEvents++;
        this.stats.lastEvent = event.timestamp;

        logger.info('Broadcasting event', {
            eventId: event.id,
            endpoint: event.endpoint,
            source: event.source,
            activeConnections: this.stats.activeConnections
        });

        this.io.emit('webhook', event);
    }

    getStats(): ServerStats {
        return {
            ...this.stats,
            uptime: Date.now() - this.startTime.getTime()
        };
    }

    getActiveConnections(): number {
        return this.stats.activeConnections;
    }

    getTotalEvents(): number {
        return this.stats.totalEvents;
    }
} 
