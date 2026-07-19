# TripMind API Contract

Base URL: `/api/v1`

## Response Envelope

### Success (single resource)
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

### Success (paginated)
```json
{
  "success": true,
  "message": "...",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Auth

### POST /auth/register
**Body:**
```json
{
  "name": "string (2-50 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)",
  "avatar": "string (URL, optional)"
}
```
**Response 201:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "_id", "name", "email", "avatar", "role", "createdAt", "updatedAt" },
    "accessToken": "string"
  }
}
```
Sets `refreshToken` httpOnly cookie.

### POST /auth/login
**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response 200:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id", "name", "email", "avatar", "role", "createdAt", "updatedAt" },
    "accessToken": "string"
  }
}
```
Sets `refreshToken` httpOnly cookie.

### POST /auth/refresh
**Cookies:** `refreshToken` (httpOnly)
**Response 200:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": { "accessToken": "string" }
}
```
Rotates `refreshToken` cookie.

### GET /auth/me
**Auth:** Bearer token
**Response 200:** User object

### POST /auth/logout
**Response 200:** Clears refresh cookie.

### GET /auth/google
**Response 302:** Redirects to Google OAuth consent screen.
Sets `oauth_state` httpOnly cookie for CSRF protection.

### GET /auth/google/callback
**Query:** code, state
**Response 302:** Redirects to `${CLIENT_URL}/auth/google/callback?code=<exchange-code>`.
Validates OAuth state, exchanges authorization code for ID token, finds or creates user.

### POST /auth/google/exchange
**Body:**
```json
{
  "code": "string (exchange code from callback redirect)"
}
```
**Response 200:**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": { "_id", "name", "email", "avatar", "role", "authProvider", "createdAt", "updatedAt" },
    "accessToken": "string"
  }
}
```
Sets `refreshToken` httpOnly cookie. Exchange codes are single-use and expire after 5 minutes.

---

## Users

### GET /user/me
**Auth:** Bearer token
**Response 200:** User object

### PATCH /user/me
**Auth:** Bearer token
**Body (any of):**
```json
{
  "name": "string (2-50 chars)",
  "avatar": "string (URL)"
}
```
**Response 200:** Updated user object

---

## Destinations

### GET /destinations
**Query:** search, category, country, bestSeason, minCost, maxCost, minRating, sort, page, limit
**Response 200:** Paginated destinations

### GET /destinations/:slug
**Response 200:** Destination object

### GET /destinations/admin/all
**Auth:** Bearer token (admin)
**Query:** search, category, country, bestSeason, status, minCost, maxCost, minRating, sort, page, limit
**Response 200:** Paginated destinations (draft + published)

### GET /destinations/admin/:id
**Auth:** Bearer token (admin)
**Response 200:** Destination object

### POST /destinations
**Auth:** Bearer token (admin)
**Body:**
```json
{
  "title": "string",
  "country": "string",
  "city": "string",
  "shortDescription": "string (max 500)",
  "fullDescription": "string",
  "images": ["url", ...],
  "category": "string",
  "averageDailyCost": 0,
  "currency": "USD",
  "rating": 0,
  "reviewCount": 0,
  "bestSeason": "string",
  "recommendedDays": 1,
  "latitude": 0,
  "longitude": 0,
  "highlights": ["string"],
  "status": "draft|published"
}
```
**Response 201:** Created destination

### PATCH /destinations/:id
**Auth:** Bearer token (admin)
**Body:** Partial destination fields
**Response 200:** Updated destination

### DELETE /destinations/:id
**Auth:** Bearer token (admin)
**Response 200:** Delete confirmation

---

## Trips

### GET /trips
**Auth:** Bearer token
**Query:** status, travelStyle, sort, page, limit
**Response 200:** Paginated trips

### GET /trips/admin/all
**Auth:** Bearer token (admin)
**Response 200:** Paginated all trips

### GET /trips/:id
**Auth:** Bearer token
**Response 200:** Trip object

### POST /trips
**Auth:** Bearer token
**Body:**
```json
{
  "destinationId": "ObjectId",
  "title": "string",
  "startDate": "ISO datetime",
  "endDate": "ISO datetime",
  "travelers": 1,
  "budget": 0,
  "currency": "USD",
  "travelStyle": "budget|mid-range|luxury",
  "interests": ["string"],
  "accommodationPreference": "string",
  "transportPreference": "string",
  "status": "draft|planned|ongoing|completed|cancelled",
  "notes": "string"
}
```

### PATCH /trips/:id
**Auth:** Bearer token
**Body:** Partial trip fields (cannot modify userId, estimatedCost, itineraryId)

### DELETE /trips/:id
**Auth:** Bearer token

---

## AI Generation

### POST /ai/:tripId/generate
**Auth:** Bearer token
**Body (all optional):**
```json
{
  "dietaryPreferences": "string",
  "accessibilityNeeds": "string",
  "activityPreferences": ["string"],
  "additionalNotes": "string"
}
```
Derives from tripId: destination, startDate, endDate, travelers, budget, currency, travelStyle.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "itinerary": {
      "_id": "...",
      "tripId": "...",
      "summary": "...",
      "days": [
        {
          "dayNumber": 1,
          "date": "YYYY-MM-DD",
          "title": "...",
          "activities": [
            {
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "title": "...",
              "description": "...",
              "location": "...",
              "estimatedCost": 0,
              "category": "...",
              "notes": "..."
            }
          ]
        }
      ],
      "costBreakdown": {},
      "warnings": [],
      "recommendations": [],
      "status": "draft",
      "aiModel": "gemini-2.0-flash"
    },
    "generationTimeMs": 0
  }
}
```

---

## Notifications

### GET /notifications
**Auth:** Bearer token
**Query:** type (all 12 types supported), isRead (true|false), sort, page, limit
**Response 200:** Paginated notifications

### GET /notifications/unread-count
**Response 200:** `{ "count": number }`

### PATCH /notifications/read-all
**Response 200:** `{ "modifiedCount": number }`

### PATCH /notifications/:id/read
**Response 200:** Updated notification

### DELETE /notifications/clear-read
**Response 200:** `{ "deletedCount": number }`

### DELETE /notifications/:id
**Response 200:** Delete confirmation

---

## Payments

### POST /payments/create-checkout-session
**Auth:** Bearer token
**Body:** `{ "productType": "subscription|credit_pack" }`
**Response 200:** `{ "sessionId": "...", "url": "..." }`

### POST /payments/webhook
**Raw body** with Stripe signature
**Events handled:** checkout.session.completed, checkout.session.expired, payment_intent.payment_failed

### GET /payments/me
**Auth:** Bearer token
**Response 200:** Paginated payments

### GET /payments/:id
**Auth:** Bearer token
**Response 200:** Payment object

---

## Subscriptions

### POST /subscriptions/create-portal-session
**Auth:** Bearer token
**Response 200:** `{ "url": "..." }`

### GET /subscriptions/me
**Auth:** Bearer token
**Response 200:** Subscription object

---

## AI Assistant

### POST /ai-assistant/conversations
**Auth:** Bearer token
**Body:**
```json
{
  "tripId": "string (optional)",
  "title": "string (optional)"
}
```
**Response 201:** Conversation object

### GET /ai-assistant/conversations
**Auth:** Bearer token
**Query:** page, limit
**Response 200:** Paginated conversations

### GET /ai-assistant/conversations/:conversationId
**Auth:** Bearer token
**Response 200:** Conversation object

### DELETE /ai-assistant/conversations/:conversationId
**Auth:** Bearer token
**Response 200:** Delete confirmation

### GET /ai-assistant/conversations/:conversationId/messages
**Auth:** Bearer token
**Query:** page, limit
**Response 200:** Paginated messages

### POST /ai-assistant/conversations/:conversationId/messages
**Auth:** Bearer token
**Body:**
```json
{
  "content": "string (1-8000 chars)"
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "userMessage": { "_id", "role", "content", "createdAt" },
    "assistantMessage": { "_id", "role", "content", "toolCalls": [...], "createdAt" }
  }
}
```

**Available Assistant Tools:**
- `get_trip_context` — Trip details, destination, budget, preferences
- `get_itinerary` — Full itinerary with days and activities
- `summarize_budget` — Budget breakdown and analysis
- `identify_expensive_activities` — Most expensive activities
- `suggest_lower_cost_replacements` — Cost-saving suggestions
- `identify_long_travel_gaps` — Gaps between activities

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 5000 | Server port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | Access token secret |
| JWT_REFRESH_SECRET | Yes | - | Refresh token secret |
| JWT_EXPIRES_IN | No | 15m | Access token expiry |
| JWT_REFRESH_EXPIRES_IN | No | 7d | Refresh token expiry |
| GEMINI_API_KEY | Yes | - | Google Gemini API key |
| STRIPE_SECRET_KEY | No | - | Stripe secret key |
| STRIPE_WEBHOOK_SECRET | No | - | Stripe webhook secret |
| STRIPE_PRO_MONTHLY_PRICE_ID | No | - | Stripe price ID |
| STRIPE_AI_CREDITS_10_PRICE_ID | No | - | Stripe price ID |
| CLIENT_URL | No | http://localhost:3000 | Frontend URL |
| SERVER_URL | No | http://localhost:5000 | Backend URL |
| ALLOWED_ORIGINS | No | CLIENT_URL | Comma-separated CORS origins |
| GOOGLE_CLIENT_ID | No | - | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | No | - | Google OAuth client secret |
| GOOGLE_CALLBACK_URL | No | http://localhost:5000/api/v1/auth/google/callback | Google OAuth callback URL |
