#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { WebSocketClient } from './client';
import { EventForwarder } from './forwarder';
import { WebhookEvent, ClientConfig, ConnectionStatus } from '../shared/types';
import { formatEvent } from '../shared/utils';
import winston from 'winston';

// Configure winston to be less verbose for CLI
winston.configure({
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

class AnchrCLI {
    private client: WebSocketClient | null = null;
    private forwarder: EventForwarder | null = null;
    private spinner: any = null;
    private isRunning = false;

    constructor() {
        this.setupCommands();
    }

    private setupCommands() {
        const program = new Command();

        program
            .name('anchr')
            .description('Webhook event forwarding CLI tool')
            .version('1.0.0');

        program
            .command('subscribe')
            .description('Subscribe to webhook events and forward them to local endpoints')
            .requiredOption('-s, --server <url>', 'WebSocket server URL (e.g., http://localhost:3000)')
            .option('-f, --forward-to <endpoints...>', 'Local endpoints to forward events to')
            .option('-e, --endpoints <endpoints...>', 'Specific webhook endpoints to subscribe to (e.g., /github, /stripe)')
            .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '5000')
            .option('-r, --retries <number>', 'Max reconnection attempts', '5')
            .option('-i, --interval <ms>', 'Reconnection interval in milliseconds', '1000')
            .action(async (options) => {
                await this.subscribe(options);
            });

        program
            .command('test')
            .description('Test connection to webhook server')
            .requiredOption('-s, --server <url>', 'WebSocket server URL')
            .action(async (options) => {
                await this.testConnection(options.server);
            });

        program.parse();
    }

    private async subscribe(options: any) {
        try {
            console.log(chalk.blue('🚀 Starting Anchr CLI...\n'));

            const config: ClientConfig = {
                serverUrl: options.server,
                forwardEndpoints: options.forwardTo || [],
                subscribeEndpoints: options.endpoints || [],
                reconnectInterval: parseInt(options.interval),
                maxRetries: parseInt(options.retries)
            };

            this.client = new WebSocketClient(config);
            this.forwarder = new EventForwarder(config.forwardEndpoints, parseInt(options.timeout));

            // Set up event handling
            this.client.setEventCallback(async (event: WebhookEvent) => {
                await this.handleEvent(event, config.subscribeEndpoints);
            });

            this.client.setStatusCallback((status: ConnectionStatus) => {
                this.handleStatusChange(status);
            });

            // Connect to server
            this.spinner = ora('Connecting to server...').start();
            await this.client.connect();
            this.spinner.succeed('Connected to server');

            this.isRunning = true;
            console.log(chalk.green('\n✅ Successfully connected!'));

            if (config.subscribeEndpoints && config.subscribeEndpoints.length > 0) {
                console.log(chalk.cyan(`📡 Listening for webhook events on: ${config.subscribeEndpoints.join(', ')}`));
            } else {
                console.log(chalk.cyan(`📡 Listening for all webhook events...`));
            }

            if (config.forwardEndpoints.length > 0) {
                console.log(chalk.yellow(`📤 Forwarding to: ${config.forwardEndpoints.join(', ')}`));
            } else {
                console.log(chalk.yellow('⚠️  No forwarding endpoints configured. Use --forward-to to specify endpoints.'));
            }

            console.log(chalk.gray('\nPress Ctrl+C to stop\n'));

            // Show help for endpoint filtering
            if (config.subscribeEndpoints && config.subscribeEndpoints.length > 0) {
                console.log(chalk.blue('💡 Tip: Only events from the specified endpoints will be processed.'));
                console.log(chalk.blue('   Use -e flag to change which endpoints to listen to.\n'));
            }

            // Keep the process running
            process.on('SIGINT', () => {
                this.shutdown();
            });

            process.on('SIGTERM', () => {
                this.shutdown();
            });

        } catch (error) {
            if (this.spinner) {
                this.spinner.fail('Failed to connect');
            }
            console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
            process.exit(1);
        }
    }

    private async handleEvent(event: WebhookEvent, subscribeEndpoints?: string[]) {
        // Check if we should process this event based on endpoint filtering
        if (subscribeEndpoints && subscribeEndpoints.length > 0) {
            const shouldProcess = subscribeEndpoints.some(endpoint =>
                event.endpoint === endpoint || event.endpoint.startsWith(endpoint)
            );

            if (!shouldProcess) {
                // Skip this event as it doesn't match our endpoint filter
                return;
            }
        }

        console.log(chalk.cyan(`\n📨 ${formatEvent(event)}`));

        if (this.forwarder && this.forwarder.getEndpoints().length > 0) {
            const results = await this.forwarder.forwardEvent(event);

            for (const result of results) {
                if (result.success) {
                    console.log(chalk.green(`  ✅ Forwarded to ${result.endpoint} (${result.statusCode}) in ${result.responseTime}ms`));
                } else {
                    console.log(chalk.red(`  ❌ Failed to forward to ${result.endpoint}: ${result.error}`));
                }
            }
        }
    }

    private handleStatusChange(status: ConnectionStatus) {
        if (!status.connected && this.isRunning) {
            console.log(chalk.yellow(`\n⚠️  Disconnected from server: ${status.error}`));
            if (status.reconnectAttempts > 0) {
                console.log(chalk.yellow(`🔄 Reconnection attempt ${status.reconnectAttempts}`));
            }
        } else if (status.connected && status.reconnectAttempts > 0) {
            console.log(chalk.green(`\n✅ Reconnected to server`));
        }
    }

    private async testConnection(serverUrl: string) {
        try {
            console.log(chalk.blue('🧪 Testing connection...\n'));

            const config: ClientConfig = {
                serverUrl,
                forwardEndpoints: []
            };

            const client = new WebSocketClient(config);

            const spinner = ora('Connecting...').start();
            await client.connect();
            spinner.succeed('Connection successful');

            console.log(chalk.green('\n✅ Server is reachable!'));

            // Test ping
            spinner.text = 'Testing ping...';
            spinner.start();

            setTimeout(() => {
                client.ping();
                setTimeout(() => {
                    spinner.succeed('Ping successful');
                    console.log(chalk.green('\n✅ Server is responsive!'));
                    client.disconnect();
                    process.exit(0);
                }, 1000);
            }, 1000);

        } catch (error) {
            console.error(chalk.red(`❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`));
            process.exit(1);
        }
    }

    private shutdown() {
        console.log(chalk.yellow('\n\n🛑 Shutting down...'));

        if (this.client) {
            this.client.disconnect();
        }

        console.log(chalk.green('👋 Goodbye!'));
        process.exit(0);
    }
}

// Start CLI if this file is run directly
if (require.main === module) {
    new AnchrCLI();
} 
