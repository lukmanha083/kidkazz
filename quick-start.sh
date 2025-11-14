#!/bin/bash

# KidKazz Quick Start Script
# Automates the setup and launch of all services

set -e

echo "🛍️  KidKazz E-Commerce Platform - Quick Start"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${YELLOW}⚠️  tmux is not installed. Installing...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install tmux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y tmux
    fi
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm is not installed. Installing...${NC}"
    npm install -g pnpm
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install

echo ""
echo -e "${BLUE}🗄️  Database Setup${NC}"
echo "Before starting services, you need to:"
echo "1. Login to Cloudflare: npx wrangler login"
echo "2. Create databases (see SETUP_TUTORIAL.md)"
echo "3. Update wrangler.jsonc files with database IDs"
echo "4. Run migrations"
echo ""
read -p "Have you completed the database setup? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please complete the database setup first."
    echo "Follow the guide in SETUP_TUTORIAL.md"
    exit 1
fi

echo ""
echo -e "${BLUE}🔐 JWT Secret Setup${NC}"
if [ ! -f "services/user-service/.dev.vars" ]; then
    echo "Generating JWT secret..."
    JWT_SECRET=$(openssl rand -base64 32)
    cat > services/user-service/.dev.vars << EOF
JWT_SECRET=$JWT_SECRET
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
EOF
    echo -e "${GREEN}✅ JWT secret created${NC}"
else
    echo -e "${GREEN}✅ JWT secret already exists${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Starting all services...${NC}"

# Kill existing tmux session if it exists
tmux kill-session -t kidkazz 2>/dev/null || true

# Create new tmux session
tmux new-session -d -s kidkazz -n "services"

# Split window into 8 panes (7 services + 1 dashboard)
tmux split-window -h
tmux split-window -v
tmux select-pane -t 0
tmux split-window -v
tmux select-pane -t 2
tmux split-window -v
tmux select-pane -t 4
tmux split-window -v
tmux select-pane -t 6
tmux split-window -v
tmux select-pane -t 8
tmux split-window -v

# Start services in each pane
tmux select-pane -t 0
tmux send-keys "cd services/api-gateway && echo '🌐 Starting API Gateway...' && pnpm dev" C-m

tmux select-pane -t 1
tmux send-keys "cd services/product-service && echo '📦 Starting Product Service...' && pnpm dev" C-m

tmux select-pane -t 2
tmux send-keys "cd services/user-service && echo '👤 Starting User Service...' && pnpm dev" C-m

tmux select-pane -t 3
tmux send-keys "cd services/order-service && echo '🛒 Starting Order Service...' && pnpm dev" C-m

tmux select-pane -t 4
tmux send-keys "cd services/payment-service && echo '💳 Starting Payment Service...' && pnpm dev" C-m

tmux select-pane -t 5
tmux send-keys "cd services/inventory-service && echo '📊 Starting Inventory Service...' && pnpm dev" C-m

tmux select-pane -t 6
tmux send-keys "cd services/shipping-service && echo '🚚 Starting Shipping Service...' && pnpm dev" C-m

tmux select-pane -t 7
tmux send-keys "sleep 5 && cd apps/admin-dashboard && echo '🎨 Starting Admin Dashboard...' && pnpm install && pnpm dev" C-m

echo ""
echo -e "${GREEN}✅ All services starting in tmux session 'kidkazz'${NC}"
echo ""
echo "Services:"
echo "  - API Gateway:        http://localhost:8787"
echo "  - Product Service:    http://localhost:8788"
echo "  - User Service:       http://localhost:8791"
echo "  - Order Service:      http://localhost:8789"
echo "  - Payment Service:    http://localhost:8790"
echo "  - Inventory Service:  http://localhost:8792"
echo "  - Shipping Service:   http://localhost:8793"
echo ""
echo "  - Admin Dashboard:    http://localhost:5173"
echo ""
echo "tmux commands:"
echo "  - Attach:  tmux attach -t kidkazz"
echo "  - Detach:  Ctrl+b then d"
echo "  - Switch:  Ctrl+b then arrow keys"
echo "  - Kill:    tmux kill-session -t kidkazz"
echo ""
echo -e "${YELLOW}⏳ Waiting 10 seconds for services to start...${NC}"
sleep 10

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Attach to tmux: tmux attach -t kidkazz"
echo "2. Open Admin Dashboard: http://localhost:5173"
echo "3. Check Service Status tab to verify all services are healthy"
echo "4. Register an admin user in the Authentication tab"
echo "5. Start testing!"
echo ""
echo "For detailed instructions, see: SETUP_TUTORIAL.md"
