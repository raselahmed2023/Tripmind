# TripMind AI Server

Agentic AI Travel Planning Platform — Backend

## Tech Stack

- Node.js + Express.js
- TypeScript (strict mode)
- MongoDB + Mongoose
- Zod (validation)
- Gemini AI (itinerary generation)
- Stripe (payments)
- ESLint + Prettier

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Seed demo data
npm run seed

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Type-check without emitting |
| `npm run seed` | Seed database with demo data |
| `npm run seed:demo` | Seed with demo account specifically |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | development/production/test |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Access token secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret |
| `JWT_EXPIRES_IN` | No | Access token expiry (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiry (default: 7d) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook secret |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | No | Stripe Pro Monthly price |
| `STRIPE_AI_CREDITS_10_PRICE_ID` | No | Stripe AI Credits price |
| `CLIENT_URL` | No | Frontend URL (default: http://localhost:3000) |
| `SERVER_URL` | No | Backend URL (default: http://localhost:5000) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |

## Demo Account

After running `npm run seed`:

- **Email:** demo@tripmind.ai
- **Password:** Demo123!

## Project Structure

```
src/
├── config/          # Environment validation & config
├── middleware/       # Express middleware (auth, error handling, 404)
├── modules/         # Feature modules
│   ├── auth/        # Authentication (register, login, refresh, logout)
│   ├── user/        # User profile management
│   ├── destination/ # Destination CRUD + admin
│   ├── trip/        # Trip management
│   ├── itinerary/   # Itinerary management
│   ├── ai/          # AI trip plan generation
│   ├── notification/# Notifications
│   ├── payment/     # Stripe payments
│   └── subscription/# Subscription management
├── routes/          # Health routes
├── scripts/         # Database seed scripts
├── types/           # TypeScript type augmentations
├── utils/           # Shared utilities (ApiError, ApiResponse, asyncHandler)
├── app.ts           # Express app setup
└── server.ts        # Entry point
```

## API

See [docs/API_CONTRACT.md](docs/API_CONTRACT.md) for the full API contract.
