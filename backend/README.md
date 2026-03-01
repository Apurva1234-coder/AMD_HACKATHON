# Crisis Mapping Backend API

Node.js + Express backend with Gemini AI integration for crisis message classification.

## Features

- 🤖 Gemini AI-powered message classification
- 🔒 Secure API key management
- 🚀 Production-ready with rate limiting
- 📝 Minimal token usage optimization
- ⚡ Fast classification into 5 categories

## Categories

Messages are classified into exactly ONE category:

- **Emergency**: Immediate danger, urgent rescue needed
- **Medical**: Healthcare needs, injuries, medical supplies
- **Resource**: Food, water, shelter, basic needs
- **Safe**: Safety confirmations, all-clear messages
- **General**: Information, questions, other communications

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Gemini API key
   ```

3. **Start server**:
   ```bash
   npm start
   # Or for development:
   npm run dev
   ```

4. **Test the API**:
   ```bash
   curl -X POST http://localhost:3001/api/classify \
     -H "Content-Type: application/json" \
     -d '{"message": "Building collapsed, people trapped inside!"}'
   ```

## API Endpoints

### POST /api/classify

Classify a crisis message.

**Request**:
```json
{
  "message": "Your crisis message here"
}
```

**Response**:
```json
{
  "category": "Emergency"
}
```

**Error Response** (with fallback):
```json
{
  "error": "Error description",
  "category": "General"
}
```

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | production |
| `CORS_ORIGIN` | CORS origin | * |

## Error Handling

- If Gemini API fails → Returns `{"category": "General"}`
- Invalid input → Returns `400` with `{"category": "General"}`
- Server errors → Returns `500` with `{"category": "General"}`
- Rate limiting → Returns `429` after 100 requests/15min

## Production Considerations

- ✅ Rate limiting implemented
- ✅ Input validation (max 500 chars)
- ✅ Error handling with fallbacks
- ✅ Security headers (Helmet)
- ✅ CORS configured
- ✅ Health check endpoint
- ✅ Optimized for low token usage

## Dependencies

- **express**: Web framework
- **@google/generative-ai**: Gemini AI SDK
- **cors**: Cross-origin requests
- **helmet**: Security headers
- **dotenv**: Environment variables
- **express-rate-limit**: Rate limiting

## License

MIT