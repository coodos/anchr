#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { WebhookReceiver } from './webhook';
import { WebSocketServer } from './websocket';
import { WebhookEvent, ServerConfig } from '../shared/types';
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

class AnchrServer {
    private app: express.Application;
    private server: any;
    private webhookReceiver: WebhookReceiver;
    private wsServer: WebSocketServer;
    private config: ServerConfig;

    constructor(config: ServerConfig) {
        this.config = config;
        this.app = express();
        this.server = createServer(this.app);

        this.webhookReceiver = new WebhookReceiver();
        this.wsServer = new WebSocketServer(this.server);

        this.setupMiddleware();
        this.setupRoutes();
        this.setupEventHandling();
    }

    private setupMiddleware() {
        // Security middleware
        this.app.use(helmet());

        // CORS
        this.app.use(cors({
            origin: this.config.corsOrigin || "*",
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Body parsing
        this.app.use(express.json({ limit: this.config.maxPayloadSize || '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: this.config.maxPayloadSize || '10mb' }));

        // Request logging
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path} from ${req.ip}`);
            next();
        });
    }

    private setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: '1.0.0'
            });
        });

        // Stats endpoint
        this.app.get('/stats', (req, res) => {
            res.json(this.wsServer.getStats());
        });

        // Webhook endpoint - catch all POST requests
        this.app.post('*', this.webhookReceiver.getMiddleware());

        // Default response for non-POST requests
        this.app.use('*', (req, res) => {
            if (req.method !== 'POST') {
                res.status(405).json({
                    error: 'Method not allowed',
                    message: 'Only POST requests are accepted for webhook endpoints'
                });
            }
        });
    }

    private setupEventHandling() {
        this.webhookReceiver.setEventCallback((event: WebhookEvent) => {
            this.wsServer.broadcastEvent(event);
        });
    }

    start() {
        this.server.listen(this.config.port, this.config.host, () => {
            logger.info(`🚀 Anchr server started on ${this.config.host}:${this.config.port}`);
            logger.info(`📡 WebSocket server ready for connections`);
            logger.info(`🔗 Webhook URL: http://${this.config.host}:${this.config.port}/webhook/*`);
            logger.info(`📊 Stats: http://${this.config.host}:${this.config.port}/stats`);
            logger.info(`💚 Health: http://${this.config.host}:${this.config.port}/health`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            this.server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            this.server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const config: ServerConfig = {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        corsOrigin: process.env.CORS_ORIGIN,
        maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '10mb'
    };

      const server = new AnchrServer(config);
  server.start();
}

export { AnchrServer }; 
