import { v4 as uuidv4 } from 'uuid';
import { WebhookEvent, EventFilter } from './types';

export function generateEventId(): string {
    return uuidv4();
}

export function createWebhookEvent(
    source: string,
    endpoint: string,
    headers: Record<string, string>,
    body: any,
    method: string,
    ip: string,
    userAgent?: string
): WebhookEvent {
    return {
        id: generateEventId(),
        timestamp: new Date(),
        source,
        endpoint,
        headers,
        body,
        method,
        ip,
        userAgent
    };
}

export function matchesFilter(event: WebhookEvent, filter: EventFilter): boolean {
    if (filter.source && event.source !== filter.source) {
        return false;
    }

    if (filter.endpoint && event.endpoint !== filter.endpoint) {
        return false;
    }

    if (filter.method && event.method !== filter.method) {
        return false;
    }

    if (filter.headers) {
        for (const [key, value] of Object.entries(filter.headers)) {
            if (event.headers[key] !== value) {
                return false;
            }
        }
    }

    return true;
}

export function formatEvent(event: WebhookEvent): string {
    return `[${event.timestamp.toISOString()}] ${event.method} ${event.endpoint} from ${event.source} (${event.ip})`;
}

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const [key, value] of Object.entries(headers)) {
        if (sensitiveHeaders.includes(key.toLowerCase())) {
            sanitized[key] = '[REDACTED]';
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
} 
