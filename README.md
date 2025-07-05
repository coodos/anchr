# Anchr - Webhook Event Forwarding System

A real-time webhook event forwarding system that captures webhook events on a VPS and streams them to local development environments via WebSocket.

## 🚀 Features

- **Universal Webhook Receiver**: Accepts webhook POST requests on any endpoint
- **Real-time Streaming**: WebSocket-based event broadcasting
- **Local Forwarding**: Forward events to multiple local endpoints
- **CLI Tool**: Easy-to-use command-line interface
- **Connection Management**: Automatic reconnection and error handling
- **Event Filtering**: Filter events by source, endpoint, method, and headers
- **Health Monitoring**: Server status and connection health checks

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd anchr

# Install dependencies
pnpm install

# Build the project
pnpm run build
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Webhook       │    │   Anchr Server  │    │   CLI Client    │
│   Sources       │───▶│   (VPS)         │◄───│   (Local)       │
│   (GitHub, etc) │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Local Endpoint│
                       │   (Your App)    │
                       └─────────────────┘
```

## 🚀 Quick Start

### 1. Start the Server (VPS)

```bash
# Development mode
pnpm run dev

# Production mode
pnpm run build
pnpm start

# With custom configuration
PORT=8080 HOST=0.0.0.0 pnpm start
```

The server will start on `http://localhost:3000` (or your specified port).

### 2. Use the CLI Client (Local)

```bash
# Subscribe to events and forward to local endpoint
pnpm run cli subscribe -s http://your-vps-ip:3000 -f http://localhost:3000/webhook

# Test connection
pnpm run cli test -s http://your-vps-ip:3000

# Subscribe without forwarding (just view events)
pnpm run cli subscribe -s http://your-vps-ip:3000
```

## 📖 Usage

### Server Configuration

Environment variables:
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `CORS_ORIGIN`: CORS origin (default: "*")
- `MAX_PAYLOAD_SIZE`: Max payload size (default: 10mb)

### CLI Commands

#### Subscribe to Events
```bash
anchr subscribe -s <server-url> [options]

Options:
  -s, --server <url>           WebSocket server URL (required)
  -f, --forward-to <endpoints> Local endpoints to forward events to
  -e, --endpoints <endpoints>  Specific webhook endpoints to subscribe to (e.g., /github, /stripe)
  -t, --timeout <ms>          Request timeout in milliseconds (default: 5000)
  -r, --retries <number>      Max reconnection attempts (default: 5)
  -i, --interval <ms>         Reconnection interval in milliseconds (default: 1000)
```

#### Test Connection
```bash
anchr test -s <server-url>

Options:
  -s, --server <url>          WebSocket server URL (required)
```

### Examples

#### Basic Usage
```bash
# Start server on VPS
pnpm start

# Connect CLI and forward to local app
anchr subscribe -s http://your-vps-ip:3000 -f http://localhost:3000/webhook
```

#### Multiple Endpoints
```bash
# Forward to multiple local endpoints
anchr subscribe -s http://your-vps-ip:3000 \
  -f http://localhost:3000/webhook \
  -f http://localhost:8080/api/events \
  -f http://localhost:9000/hooks
```

#### Custom Configuration
```bash
# With custom timeout and retry settings
anchr subscribe -s http://your-vps-ip:3000 \
  -f http://localhost:3000/webhook \
  -t 10000 \
  -r 10 \
  -i 2000
```

#### Endpoint Filtering
```bash
# Subscribe only to GitHub webhooks
anchr subscribe -s http://your-vps-ip:3000 \
  -e /github \
  -f http://localhost:3000/github-webhook

# Subscribe to multiple specific endpoints
anchr subscribe -s http://your-vps-ip:3000 \
  -e /github /stripe /slack \
  -f http://localhost:3000/webhook

# Subscribe to all endpoints starting with /api
anchr subscribe -s http://your-vps-ip:3000 \
  -e /api \
  -f http://localhost:3000/api-webhook
```

## 🔧 Development

### Project Structure
```
anchr/
├── src/
│   ├── server/           # VPS server components
│   │   ├── index.ts      # Server entry point
│   │   ├── webhook.ts    # Webhook receiver
│   │   └── websocket.ts  # WebSocket server
│   ├── cli/              # CLI client components
│   │   ├── index.ts      # CLI entry point
│   │   ├── client.ts     # WebSocket client
│   │   └── forwarder.ts  # Event forwarder
│   └── shared/           # Shared types and utilities
│       ├── types.ts      # TypeScript interfaces
│       └── utils.ts      # Utility functions
├── dist/                 # Compiled output
└── package.json
```

### Available Scripts
```bash
# Development
pnpm run dev          # Start server in development mode
pnpm run cli:dev      # Start CLI in development mode

# Build
pnpm run build        # Build TypeScript to JavaScript

# Production
pnpm start            # Start server in production mode
pnpm run cli          # Start CLI in production mode
```

## 🌐 API Endpoints

### Server Endpoints
- `POST /*` - Universal webhook endpoint
- `GET /health` - Health check
- `GET /stats` - Server statistics
- WebSocket - Real-time event streaming

### Webhook Response Format
```json
{
  "success": true,
  "eventId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Event Format
```json
{
  "id": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "source": "client-ip",
  "endpoint": "/webhook/github",
  "headers": { "content-type": "application/json" },
  "body": { "event": "push" },
  "method": "POST",
  "ip": "client-ip",
  "userAgent": "GitHub-Hookshot/..."
}
```

## 🔒 Security

- **CORS**: Configurable CORS settings
- **Helmet**: Security headers
- **Rate Limiting**: Built-in protection against spam
- **Header Sanitization**: Sensitive headers are redacted

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if server is running
   - Verify server URL and port
   - Check firewall settings

2. **Events Not Forwarding**
   - Verify local endpoints are running
   - Check endpoint URLs
   - Review timeout settings

3. **High Latency**
   - Increase timeout values
   - Check network connectivity
   - Monitor server resources

### Debug Mode
```bash
# Enable debug logging
DEBUG=* pnpm run dev
DEBUG=* anchr subscribe -s http://localhost:3000
```

## 📝 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on GitHub. 
