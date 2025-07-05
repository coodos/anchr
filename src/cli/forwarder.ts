import axios, { AxiosResponse } from 'axios';
import { WebhookEvent, ForwardResult } from '../shared/types';
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

export class EventForwarder {
    private endpoints: string[];
    private timeout: number;

    constructor(endpoints: string[], timeout: number = 5000) {
        this.endpoints = endpoints;
        this.timeout = timeout;
    }

    async forwardEvent(event: WebhookEvent): Promise<ForwardResult[]> {
        const results: ForwardResult[] = [];
        const startTime = Date.now();

        logger.info(`Forwarding event ${event.id} to ${this.endpoints.length} endpoints`);

        for (const endpoint of this.endpoints) {
            const result = await this.forwardToEndpoint(event, endpoint, startTime);
            results.push(result);
        }

        return results;
    }

    private async forwardToEndpoint(
        event: WebhookEvent,
        endpoint: string,
        startTime: number
    ): Promise<ForwardResult> {
        const forwardStartTime = Date.now();

        try {
            logger.info(`Forwarding to ${endpoint}`);

            const response: AxiosResponse = await axios.post(endpoint, {
                ...event,
                timestamp: event.timestamp.toISOString() // Ensure timestamp is serializable
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                              'X-Anchr-Event-ID': event.id,
          'X-Anchr-Source': event.source,
          'X-Anchr-Endpoint': event.endpoint,
          'X-Anchr-Forwarded-At': new Date().toISOString()
                }
            });

            const responseTime = Date.now() - forwardStartTime;

            logger.info(`Successfully forwarded to ${endpoint} (${response.status}) in ${responseTime}ms`);

            return {
                success: true,
                endpoint,
                statusCode: response.status,
                responseTime
            };

        } catch (error) {
            const responseTime = Date.now() - forwardStartTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error(`Failed to forward to ${endpoint}: ${errorMessage}`);

            return {
                success: false,
                endpoint,
                error: errorMessage,
                responseTime
            };
        }
    }

    addEndpoint(endpoint: string) {
        if (!this.endpoints.includes(endpoint)) {
            this.endpoints.push(endpoint);
            logger.info(`Added endpoint: ${endpoint}`);
        }
    }

    removeEndpoint(endpoint: string) {
        const index = this.endpoints.indexOf(endpoint);
        if (index > -1) {
            this.endpoints.splice(index, 1);
            logger.info(`Removed endpoint: ${endpoint}`);
        }
    }

    getEndpoints(): string[] {
        return [...this.endpoints];
    }

    setEndpoints(endpoints: string[]) {
        this.endpoints = [...endpoints];
        logger.info(`Updated endpoints: ${endpoints.join(', ')}`);
    }
} 
