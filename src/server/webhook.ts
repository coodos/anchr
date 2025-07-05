import { Request, Response, NextFunction } from 'express';
import { WebhookEvent } from '../shared/types';
import { createWebhookEvent, sanitizeHeaders } from '../shared/utils';
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

export class WebhookReceiver {
    private eventCallback?: (event: WebhookEvent) => void;

    constructor() {
        this.handleWebhook = this.handleWebhook.bind(this);
    }

    setEventCallback(callback: (event: WebhookEvent) => void) {
        this.eventCallback = callback;
    }

    handleWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const source = req.get('X-Forwarded-For') || req.ip || 'unknown';
            const userAgent = req.get('User-Agent');
            const endpoint = req.path;
            const method = req.method;
            const headers = sanitizeHeaders(req.headers as Record<string, string>);
            const body = req.body;

            const event = createWebhookEvent(
                source,
                endpoint,
                headers,
                body,
                method,
                source,
                userAgent
            );

            logger.info('Webhook received', {
                eventId: event.id,
                endpoint,
                method,
                source,
                bodySize: JSON.stringify(body).length
            });

            // Send immediate response
            res.status(200).json({
                success: true,
                eventId: event.id,
                timestamp: event.timestamp.toISOString()
            });

            // Notify callback if set
            if (this.eventCallback) {
                this.eventCallback(event);
            }

        } catch (error) {
            logger.error('Error processing webhook', { error: error instanceof Error ? error.message : String(error) });
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Middleware to handle all webhook routes
    getMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Only handle POST requests for webhooks
            if (req.method === 'POST') {
                this.handleWebhook(req, res, next);
            } else {
                next();
            }
        };
    }
} 
