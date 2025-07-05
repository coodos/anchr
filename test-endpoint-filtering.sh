#!/bin/bash

echo "🧪 Testing Anchr Endpoint Filtering"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Starting Anchr Server...${NC}"
pnpm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3
echo -e "${GREEN}✅ Server started${NC}"
echo ""

echo -e "${BLUE}2. Testing endpoint filtering...${NC}"
echo "   Starting CLI that only listens to /github and /stripe endpoints"
echo ""

# Start CLI in background with endpoint filtering
pnpm run cli subscribe -s http://localhost:3000 -e /github /stripe > cli_output.log 2>&1 &
CLI_PID=$!
sleep 3

echo -e "${YELLOW}Sending webhook to /github (should be received)...${NC}"
curl -s -X POST http://localhost:3000/github \
  -H "Content-Type: application/json" \
  -d '{"event": "push", "repo": "test/github-repo"}' > /dev/null
sleep 2

echo -e "${YELLOW}Sending webhook to /stripe (should be received)...${NC}"
curl -s -X POST http://localhost:3000/stripe \
  -H "Content-Type: application/json" \
  -d '{"event": "payment.succeeded", "amount": 1000}' > /dev/null
sleep 2

echo -e "${YELLOW}Sending webhook to /other (should be ignored)...${NC}"
curl -s -X POST http://localhost:3000/other \
  -H "Content-Type: application/json" \
  -d '{"event": "other", "data": "ignored"}' > /dev/null
sleep 2

echo -e "${YELLOW}Sending webhook to /api/users (should be ignored)...${NC}"
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"event": "user.created"}' > /dev/null
sleep 2

echo ""
echo -e "${BLUE}3. CLI Output (last 20 lines):${NC}"
echo "----------------------------------------"
tail -20 cli_output.log

echo ""
echo -e "${BLUE}4. Cleaning up...${NC}"
kill $CLI_PID 2>/dev/null
kill $SERVER_PID 2>/dev/null
rm -f cli_output.log

echo -e "${GREEN}✅ Test completed!${NC}"
echo ""
echo -e "${YELLOW}Expected behavior:${NC}"
echo "   - /github and /stripe events should be received"
echo "   - /other and /api/users events should be ignored"
echo "" 