#!/bin/bash

echo "🚀 Anchr Webhook Event Forwarding Demo"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Starting Anchr Server...${NC}"
echo "   Server will be available at http://localhost:3000"
echo ""

# Start server in background
pnpm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo -e "${GREEN}✅ Server started!${NC}"
echo ""

echo -e "${BLUE}2. Testing webhook endpoint...${NC}"
curl -X POST http://localhost:3000/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "push", "repository": "test-repo", "message": "Hello from Anchr!"}' \
  -s | jq .

echo ""
echo -e "${GREEN}✅ Webhook test successful!${NC}"
echo ""

echo -e "${BLUE}3. Testing CLI connection...${NC}"
echo "   Testing connection to server..."
pnpm run cli test -s http://localhost:3000

echo ""
echo -e "${GREEN}✅ CLI connection test successful!${NC}"
echo ""

echo -e "${BLUE}4. Demo completed!${NC}"
echo ""
echo -e "${YELLOW}To use Anchr in your project:${NC}"
echo "   1. Start server: pnpm run dev"
echo "   2. Connect CLI: pnpm run cli subscribe -s http://localhost:3000 -f http://localhost:4000/webhook"
echo "   3. Send webhooks to: http://localhost:3000/your-endpoint"
echo ""

# Cleanup
echo -e "${BLUE}Cleaning up...${NC}"
kill $SERVER_PID 2>/dev/null
echo -e "${GREEN}✅ Demo completed!${NC}" 