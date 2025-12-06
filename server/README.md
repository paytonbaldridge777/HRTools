# Accessibility Scanner Server

This is a server-side accessibility scanner that uses Puppeteer and axe-core to provide robust, headless browser-based accessibility scanning.

## Why Use the Server-Side Scanner?

The client-side scanner (in `public/Accessibility/index.html`) has limitations:
- **Content Security Policy (CSP)**: Some sites block script injection
- **Anti-bot protections**: Some sites detect and block automated tools
- **Complex JavaScript**: Sites with heavy client-side rendering may not load properly in an iframe

The server-side scanner uses a real headless Chrome browser via Puppeteer, which:
- ✅ Executes JavaScript just like a real browser
- ✅ Waits for network idle before scanning
- ✅ Bypasses most CSP issues (runs in actual browser context)
- ✅ Provides more consistent and reliable results

## Installation

From the `server/` directory, install dependencies:

```bash
cd server
npm install
```

This will install:
- `express` - Web server framework
- `puppeteer` - Headless Chrome automation (includes Chrome binary)
- `axe-core` - Accessibility testing engine

## Usage

### Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000` by default.

You can customize the port with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Scan a URL

Make a GET request to `/scan?url=<target_url>`:

```bash
curl "http://localhost:3000/scan?url=https://example.com"
```

Or use your browser:
```
http://localhost:3000/scan?url=https://example.com
```

### Response Format

The endpoint returns raw axe-core JSON results:

```json
{
  "violations": [...],
  "passes": [...],
  "incomplete": [...],
  "inapplicable": [...]
}
```

### Health Check

Check if the server is running:

```bash
curl http://localhost:3000/health
```

## WCAG Coverage

The scanner is configured to test against WCAG 2.0 Level A, AA, and WCAG 2.1 Level AA standards:
- `wcag2a` - WCAG 2.0 Level A
- `wcag2aa` - WCAG 2.0 Level AA
- `wcag21aa` - WCAG 2.1 Level AA

## Production Deployment

### Security Considerations

For production use, consider adding:
1. **Authentication/Authorization** - Protect the endpoint from unauthorized access
2. **Rate Limiting** - Prevent abuse and resource exhaustion
3. **URL Whitelisting** - Restrict which domains can be scanned (prevent SSRF attacks)
4. **Request Timeouts** - Currently set to 30s, adjust as needed
5. **CORS Configuration** - Restrict which origins can call the API

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to `production` in production (hides error stack traces)

### Example Production Setup

```bash
# Install dependencies
npm install --production

# Set environment variables
export PORT=3001
export NODE_ENV=production

# Start server
npm start
```

### Deployment Platforms

This server can be deployed to:
- **Railway** - Simple Node.js hosting
- **Render** - Free tier available
- **AWS ECS/EKS** - For enterprise deployments
- **Digital Ocean App Platform** - Easy deployment
- **Heroku** - Classic PaaS option

## Troubleshooting

### Puppeteer Installation Issues

If Puppeteer fails to download Chrome:

```bash
# Skip Chromium download during install
PUPPETEER_SKIP_DOWNLOAD=true npm install

# Use system Chrome
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
npm start
```

### Memory Issues

Puppeteer can be memory-intensive. For high-volume scanning:
- Increase Node.js heap size: `node --max-old-space-size=4096 scan.js`
- Use a queue system to limit concurrent scans
- Consider horizontal scaling with multiple instances

### Timeout Errors

If scans timeout on slow pages:
- Increase the timeout in `scan.js` (currently 30000ms)
- Use faster network connection
- Target specific pages instead of full sites

## License

Copyright © 2025 Texas A&M University School of Law. All rights reserved.
