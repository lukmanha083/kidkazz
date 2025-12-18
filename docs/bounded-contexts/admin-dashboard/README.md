# KidKazz Admin Dashboard

Simple admin dashboard to test all microservices in the KidKazz e-commerce platform.

## Features

- 📊 **Service Status** - Monitor all 7 microservices
- 🔐 **Authentication** - Test user registration and login with JWT
- 📦 **Products** - Create and list products (retail + wholesale)
- 🛒 **Orders** - Create and manage orders
- 🚚 **Shipping** - Get shipping rates with JET API integration

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:5173
```

## Prerequisites

Make sure all backend services are running:

- API Gateway (port 8787)
- Product Service (port 8788)
- User Service (port 8791)
- Order Service (port 8789)
- Payment Service (port 8790)
- Inventory Service (port 8792)
- Shipping Service (port 8793)

## Usage

1. **Check Service Status** - Verify all services are healthy
2. **Register/Login** - Create an admin user and get JWT token
3. **Create Products** - Add products with dual pricing (retail + wholesale)
4. **Test Shipping** - Calculate shipping rates
5. **Create Orders** - Place test orders

## Tech Stack

- React 18
- TypeScript
- Vite
- Vanilla CSS (no framework for simplicity)

## API Proxy

All `/api/*` requests are proxied to `http://localhost:8787` (API Gateway)
