# Accessibility Scanner - Implementation Guide

## Overview

This implementation provides **real accessibility analysis** using pa11y, replacing the previous mock/sample data with actual WCAG 2.1 Level AA compliance checking.

## Architecture

### Components

1. **Express Server** (`server/accessibility-scanner.js`)
   - Node.js backend with pa11y integration
   - WCAG 2.1 Level AA standard enforcement
   - Security features built-in

2. **React Component** (`src/components/AccessibilityChecker.tsx`)
   - Modern React UI with TypeScript
   - Real-time scanning interface
   - Results display and report export

3. **Astro Integration** (`src/pages/tools/accessibility-checker/index.astro`)
   - Seamlessly integrates React component into Astro static site

## Quick Start

### Prerequisites

- Node.js 18+
- Chrome/Chromium (for headless browser scanning)

### Installation

Dependencies are already installed. To reinstall:

```bash
npm install
```

### Running the Server

```bash
cd server
npm start
```

The server will start on port 3001 (configurable via `PORT` environment variable).

### Running the Frontend

In a separate terminal:

```bash
npm run dev
```

Open http://localhost:4321/tools/accessibility-checker in your browser.

### Building for Production

```bash
npm run build
```

## Security Considerations

### 1. URL Whitelisting (SSRF Prevention)

**CRITICAL:** The server implements URL whitelisting to prevent Server-Side Request Forgery (SSRF) attacks.

**Configuration:**

Set allowed domains via environment variable:
```bash
export ALLOWED_DOMAINS="law.tamu.edu,example.com,subdomain.example.com"
```

Or modify the `getAllowedDomains()` function in `server/accessibility-scanner.js`:

```javascript
return [
  'localhost',
  '127.0.0.1',
  'law.tamu.edu',
  'yourdomain.com',
  // Add your approved domains
];
```

**Why this matters:** Without whitelisting, malicious users could:
- Scan internal network resources (192.168.x.x, 10.x.x.x)
- Access cloud metadata services (169.254.169.254)
- Probe internal services

### 2. Rate Limiting

**Default:** 10 requests per minute per IP address

**Configuration:**

Modify the rate limiter in `server/accessibility-scanner.js`:

```javascript
const limiter = rateLimit({
  windowMs: 60 * 1000,  // Time window
  max: 10,              // Max requests per window
  message: 'Custom error message',
});
```

**Recommendations:**
- Stricter limits for public-facing deployments (5 req/min)
- Relaxed limits for internal authenticated users (20 req/min)
- Implement user-based rate limiting for better control

### 3. Request Timeouts

**Default:** 30 seconds per scan (max: 60 seconds)

**Purpose:**
- Prevent resource exhaustion
- Protect against slow DoS attacks
- Ensure responsive user experience

### 4. CORS Configuration

**Default:** Allows localhost origins for development

**Production Configuration:**

Set via environment variable:
```bash
export ALLOWED_ORIGINS="https://hrtools.law.tamu.edu,https://tools.yourdomain.com"
```

### 5. Additional Security Headers

The server uses Helmet.js to set security headers:
- X-DNS-Prefetch-Control
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

## Operational Notes

### Deployment Architecture

#### Recommended Setup

```
[User] → [CloudFlare/CDN] → [Reverse Proxy] → [Express Server]
                                  ↓
                          [Astro Static Site]
```

**Best Practices:**

1. **Deploy Static Site to CDN**
   - Astro site on CloudFlare Pages, Netlify, or Vercel
   - Fast, globally distributed
   - No server costs

2. **Deploy Scanner Server Separately**
   - Use a platform with long-running processes:
     - Railway.app
     - Render.com
     - AWS ECS/EKS
     - Digital Ocean App Platform
   - Configure environment variables for security

3. **Use Reverse Proxy**
   - nginx or CloudFlare Workers
   - Add authentication layer
   - Implement additional rate limiting
   - Enable request logging

#### Example nginx Configuration

```nginx
server {
    listen 80;
    server_name scanner-api.yourdomain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=scanner:10m rate=5r/m;
    limit_req zone=scanner burst=10 nodelay;

    location /api/scan {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Resource Requirements

**Memory:**
- Base: ~200MB
- Per scan: +150-300MB (headless browser)
- Recommended: 1GB minimum, 2GB for production

**CPU:**
- Moderate usage during scans
- Scales with concurrent requests
- Recommended: 2+ cores for production

**Disk:**
- Minimal (~100MB for dependencies)
- No persistent storage required

### Monitoring

**Key Metrics to Monitor:**

1. **Request Rate**
   - Track requests per minute
   - Alert on unusual spikes
   - Identify potential abuse

2. **Error Rate**
   - Failed scans (timeout, network errors)
   - Domain whitelist rejections
   - Rate limit hits

3. **Performance**
   - Average scan duration
   - Memory usage per scan
   - CPU utilization

4. **Security Events**
   - Whitelist violations
   - Rate limit violations
   - Invalid URL attempts

**Example Logging Setup:**

```javascript
// Add to server/accessibility-scanner.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Use in routes
logger.info('Scan initiated', { url, ip: req.ip });
logger.error('Scan failed', { url, error: error.message });
```

### Scaling Considerations

**For High Traffic:**

1. **Request Queuing**
   - Implement job queue (Bull, BullMQ)
   - Process scans asynchronously
   - Return job ID, poll for results

2. **Multiple Instances**
   - Run multiple server instances
   - Load balance across instances
   - Share queue backend (Redis)

3. **Caching**
   - Cache scan results by URL hash
   - Expire after 24 hours
   - Reduce redundant scans

Example Redis caching:

```javascript
import redis from 'redis';
const client = redis.createClient();

// Before scanning
const cacheKey = `scan:${Buffer.from(url).toString('base64')}`;
const cached = await client.get(cacheKey);
if (cached) return JSON.parse(cached);

// After scanning
await client.setex(cacheKey, 86400, JSON.stringify(results));
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/accessibility-check.yml`:

```yaml
name: Accessibility Check

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd server
          npm install
      
      - name: Start scanner server
        run: |
          cd server
          npm start &
          sleep 10
        env:
          PORT: 3001
          ALLOWED_DOMAINS: "localhost,127.0.0.1,law.tamu.edu"
      
      - name: Build Astro site
        run: |
          npm install
          npm run build
      
      - name: Scan deployed site
        run: |
          curl -X POST http://localhost:3001/api/scan \
            -H "Content-Type: application/json" \
            -d '{"url":"http://localhost:4321"}' \
            > scan-results.json
      
      - name: Check for critical issues
        run: |
          ERRORS=$(jq '.stats.errors' scan-results.json)
          if [ "$ERRORS" -gt 5 ]; then
            echo "Found $ERRORS critical accessibility errors!"
            exit 1
          fi
      
      - name: Upload scan results
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-scan
          path: scan-results.json
```

### Pre-deployment Checks

Add to your deployment script:

```bash
#!/bin/bash

echo "Running accessibility scan..."

# Start server
cd server && npm start &
SERVER_PID=$!
sleep 5

# Build site
npm run build

# Start preview
npm run preview &
PREVIEW_PID=$!
sleep 5

# Scan
RESULTS=$(curl -s -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:4321"}')

# Check results
ERRORS=$(echo $RESULTS | jq '.stats.errors')

# Cleanup
kill $SERVER_PID $PREVIEW_PID

# Fail if too many errors
if [ "$ERRORS" -gt 10 ]; then
  echo "❌ Deployment blocked: $ERRORS accessibility errors found"
  exit 1
fi

echo "✅ Accessibility check passed"
```

## Troubleshooting

### Common Issues

#### 1. "Failed to launch browser"

**Cause:** Puppeteer/Chrome not installed properly

**Solution:**
```bash
cd server
npm install puppeteer
# Or use system Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

#### 2. "Domain not allowed" error

**Cause:** URL not in whitelist

**Solution:**
- Add domain to `ALLOWED_DOMAINS` environment variable
- Or modify `getAllowedDomains()` function

#### 3. High memory usage

**Cause:** Browser instances not closing properly

**Solution:**
- Restart server regularly
- Implement cleanup mechanism
- Monitor for memory leaks

#### 4. Slow scan times

**Cause:** Large pages or slow network

**Solution:**
- Increase timeout value
- Optimize target page
- Add caching layer

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `ALLOWED_DOMAINS` | localhost,127.0.0.1,law.tamu.edu | Comma-separated whitelist |
| `ALLOWED_ORIGINS` | http://localhost:4321,http://localhost:3000 | CORS origins |
| `PUBLIC_SCANNER_API_URL` | http://localhost:3001 | API URL for React component |

## API Reference

### POST /api/scan

Scan a URL for accessibility issues.

**Request:**
```json
{
  "url": "https://example.com",
  "timeout": 30000
}
```

**Response (Success):**
```json
{
  "success": true,
  "url": "https://example.com",
  "documentTitle": "Example Site",
  "standard": "WCAG 2.1 Level AA",
  "issues": [
    {
      "code": "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail",
      "type": "error",
      "typeCode": 1,
      "message": "This element has insufficient contrast...",
      "context": "<p class=\"text-gray-400\">...",
      "selector": "body > main > p:nth-child(3)",
      "runner": "axe",
      "severity": "critical",
      "principle": "Perceivable",
      "wcag": "WCAG 2.1 - 1.4.3"
    }
  ],
  "stats": {
    "total": 15,
    "errors": 3,
    "warnings": 8,
    "notices": 4
  },
  "scanDuration": 3456,
  "timestamp": "2025-12-03T15:30:00.000Z"
}
```

**Response (Error):**
```json
{
  "error": "Domain not allowed",
  "message": "This domain is not in the approved whitelist...",
  "allowedDomains": ["localhost", "law.tamu.edu"]
}
```

## Future Enhancements

### Potential Improvements

1. **Document Scanning**
   - Add PDF analysis (using pdf-parse + html conversion)
   - Word document support (mammoth.js)
   - Multi-page scanning

2. **Advanced Features**
   - Scheduled recurring scans
   - Historical comparison
   - Email notifications
   - Team collaboration

3. **Integration**
   - Slack notifications
   - Jira ticket creation
   - GitHub issue automation

4. **Performance**
   - Result caching with Redis
   - Job queue with Bull
   - WebSocket for real-time updates

## Support

For issues or questions:
1. Check troubleshooting section
2. Review server logs: `server/combined.log`
3. Contact: TAMU School of Law IT Department

## License

Copyright © 2025 Texas A&M University School of Law. All rights reserved.
