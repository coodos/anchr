export interface WebhookEvent {
    id: string;
    timestamp: Date;
    source: string;
    endpoint: string;
    headers: Record<string, string>;
    body: any;
    method: string;
    ip: string;
    userAgent?: string;
}

export interface ServerConfig {
    port: number;
    host: string;
    corsOrigin?: string;
    maxPayloadSize?: string;
}

export interface ClientConfig {
    serverUrl: string;
    forwardEndpoints: string[];
    filters?: EventFilter[];
    reconnectInterval?: number;
    maxRetries?: number;
}

export interface EventFilter {
    source?: string;
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
}

export interface ConnectionStatus {
    connected: boolean;
    lastConnected?: Date;
    reconnectAttempts: number;
    error?: string;
}

export interface ForwardResult {
    success: boolean;
    endpoint: string;
    statusCode?: number;
    error?: string;
    responseTime?: number;
}

export interface ServerStats {
    totalEvents: number;
    activeConnections: number;
    uptime: number;
    lastEvent?: Date;
} 
