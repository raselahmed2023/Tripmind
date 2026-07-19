# TripMind AI Server

Agentic AI Travel Planning Platform — Backend

## Tech Stack

- Node.js + Express.js
- TypeScript (strict mode)
- MongoDB + Mongoose
- Zod (environment validation)
- ESLint + Prettier

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

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

## Project Structure

```
src/
├── config/          # Environment validation & config
├── middleware/       # Express middleware (error handling, 404)
├── routes/          # Route definitions
├── utils/           # Shared utilities (ApiError, ApiResponse, asyncHandler)
├── app.ts           # Express app setup
└── server.ts        # Entry point
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
