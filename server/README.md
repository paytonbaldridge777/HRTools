# Accessibility Scanner Server

Express server providing real-time accessibility analysis using pa11y (WCAG 2.1 Level AA).

## Quick Start

```bash
npm start
```

Server starts on port 3001 (configurable via `PORT` env var).

## Environment Variables

```bash
# Required for production
export PORT=3001
export ALLOWED_DOMAINS="law.tamu.edu,yourdomain.com"
export ALLOWED_ORIGINS="https://hrtools.law.tamu.edu"

# Optional
export NODE_ENV=production
```

## Security Features

✅ URL Whitelisting (SSRF prevention)
✅ Rate Limiting (10 req/min per IP)
✅ Request Timeouts (max 60s)
✅ CORS Configuration
✅ Security Headers (Helmet.js)

## API Endpoints

### POST /api/scan

Scan a URL for accessibility issues.

**Body:**
```json
{
  "url": "https://example.com",
  "timeout": 30000
}
```

### GET /health

Health check endpoint.

## Documentation

See `/docs/ACCESSIBILITY_SCANNER.md` for complete documentation including:
- Security considerations
- Deployment guide
- CI/CD integration
- Troubleshooting

## Dependencies

- `express` - Web framework
- `pa11y` - Accessibility testing (uses Puppeteer + axe-core)
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers
- `cors` - CORS configuration

## Notes

- Requires Chrome/Chromium for headless browser
- Memory usage: ~200MB base + 150-300MB per scan
- Recommended: 1GB RAM minimum
