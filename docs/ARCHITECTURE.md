# Accessibility Scanner Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         User's Browser                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Astro Static Site (Port 4321)                         │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │                                                  │  │   │
│  │  │  React Component: AccessibilityChecker.tsx     │  │   │
│  │  │                                                  │  │   │
│  │  │  - Input URL                                     │  │   │
│  │  │  - Display loading state                        │  │   │
│  │  │  - Render results                               │  │   │
│  │  │  - Export reports                               │  │   │
│  │  │                                                  │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                         │                              │   │
│  │                         │ HTTP POST                    │   │
│  │                         ▼                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│            Express Server (Port 3001)                          │
│            server/accessibility-scanner.js                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Security Middleware                                      │ │
│  │  - Helmet (security headers)                             │ │
│  │  - CORS (origin validation)                              │ │
│  │  - Rate Limiter (10 req/min per IP)                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  POST /api/scan                                           │ │
│  │  1. Validate URL format                                  │ │
│  │  2. Check URL whitelist (SSRF protection)               │ │
│  │  3. Validate timeout (5s - 60s)                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  pa11y Scanner                                            │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │  Puppeteer (Headless Chrome)                     │   │ │
│  │  │  - Launch browser                                 │   │ │
│  │  │  - Navigate to URL                                │   │ │
│  │  │  - Wait for page load                             │   │ │
│  │  │                                                    │   │ │
│  │  │  ┌──────────────────────────────────────────┐   │   │ │
│  │  │  │  axe-core                                 │   │   │ │
│  │  │  │  - Analyze DOM                            │   │   │ │
│  │  │  │  - Check WCAG 2.1 Level AA rules         │   │   │ │
│  │  │  │  - Identify violations                    │   │   │ │
│  │  │  │  - Generate detailed reports              │   │   │ │
│  │  │  └──────────────────────────────────────────┘   │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Response Processing                                      │ │
│  │  - Categorize issues by severity                         │ │
│  │  - Map to WCAG principles                                │ │
│  │  - Calculate statistics                                  │ │
│  │  - Format response                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│                      JSON Response                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
                    Back to Browser
```

## Data Flow

```
User Input → React Component → Express API → pa11y → Puppeteer → axe-core
                                                                      │
User Display ← React Component ← Express API ← pa11y ← Results ←────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Network                                               │
│  - Reverse Proxy (nginx/CloudFlare)                            │
│  - Authentication                                                │
│  - SSL/TLS                                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Application Security (Express Middleware)            │
│  - CORS validation                                              │
│  - Rate limiting (10 req/min)                                  │
│  - Security headers (Helmet)                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Input Validation                                      │
│  - URL format validation                                        │
│  - Domain whitelist check                                       │
│  - Timeout bounds validation                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Resource Protection                                   │
│  - Request timeout (max 60s)                                    │
│  - Browser sandboxing                                           │
│  - Memory limits                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Development
```
┌──────────────┐     ┌──────────────┐
│  localhost   │     │  localhost   │
│  :4321       │────▶│  :3001       │
│  Astro Dev   │     │  Express     │
│  Server      │     │  Server      │
└──────────────┘     └──────────────┘
```

### Production
```
┌────────────────┐     ┌──────────────┐     ┌──────────────┐
│  CloudFlare    │     │  Reverse     │     │  Express     │
│  Pages/CDN     │     │  Proxy       │     │  Server      │
│                │────▶│  (nginx)     │────▶│  (Railway/   │
│  Static Site   │     │  + Auth      │     │   Render)    │
│  (dist/)       │     │              │     │              │
└────────────────┘     └──────────────┘     └──────────────┘
```

## File Structure

```
HRTools/
│
├── Frontend (Astro + React)
│   ├── src/
│   │   ├── components/
│   │   │   └── AccessibilityChecker.tsx    ← React UI Component
│   │   └── pages/
│   │       └── tools/accessibility-checker/
│   │           └── index.astro              ← Page Integration
│   │
│   └── dist/                                ← Build Output (Static)
│
├── Backend (Express + pa11y)
│   └── server/
│       ├── accessibility-scanner.js         ← Express Server
│       ├── package.json                     ← Dependencies
│       └── .env.example                     ← Configuration Template
│
└── Documentation
    └── docs/
        ├── QUICK_START.md                   ← 5-min setup guide
        ├── ACCESSIBILITY_SCANNER.md         ← Complete docs
        ├── IMPLEMENTATION_SUMMARY.md        ← Overview
        └── ARCHITECTURE.md                  ← This file
```

## Technology Stack

```
Frontend:
  Astro 5.x ─────┐
  React 19.x ────┼──▶ Static Site Generation
  TypeScript ────┘

Backend:
  Node.js 18+ ───┐
  Express 5.x ───┼──▶ REST API Server
  pa11y 9.x ─────┘

Testing:
  Puppeteer ─────┐
  Chrome ────────┼──▶ Headless Browser
  axe-core ──────┘    + Accessibility Engine

Security:
  Helmet.js ─────┐
  CORS ──────────┼──▶ Security Middleware
  Rate Limiting ─┘
```

## API Request/Response Flow

```
Client Request:
┌────────────────────────────────────┐
│ POST /api/scan                     │
│ Content-Type: application/json     │
│                                    │
│ {                                  │
│   "url": "https://example.com",   │
│   "timeout": 30000                 │
│ }                                  │
└────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Validation & Security Checks       │
│ - URL format ✓                     │
│ - Whitelist ✓                      │
│ - Rate limit ✓                     │
└────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ pa11y Scan                         │
│ - Launch browser                   │
│ - Navigate to URL                  │
│ - Run axe-core                     │
│ - Collect issues                   │
└────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Process Results                    │
│ - Categorize by severity           │
│ - Map WCAG criteria                │
│ - Calculate stats                  │
└────────────────────────────────────┘
           │
           ▼
Server Response:
┌────────────────────────────────────┐
│ HTTP 200 OK                        │
│ Content-Type: application/json     │
│                                    │
│ {                                  │
│   "success": true,                 │
│   "url": "https://example.com",   │
│   "documentTitle": "Example",      │
│   "standard": "WCAG 2.1 Level AA", │
│   "issues": [...],                 │
│   "stats": {...},                  │
│   "scanDuration": 3456,            │
│   "timestamp": "2025-12-03..."     │
│ }                                  │
└────────────────────────────────────┘
```

## Error Handling Flow

```
Request → Validation Error? ──Yes──▶ 400 Bad Request
    │
    No
    ▼
  Whitelist Check ──Fail──▶ 403 Forbidden
    │
    Pass
    ▼
  Rate Limit ──Exceeded──▶ 429 Too Many Requests
    │
    OK
    ▼
  Scan ──Timeout──▶ 504 Gateway Timeout
    │
    │──Network Error──▶ 502 Bad Gateway
    │
    Success
    ▼
  200 OK + Results
```

## Scaling Strategy

```
Low Traffic (< 100 req/day):
  Single Server ──▶ Direct Connection

Medium Traffic (100-1000 req/day):
  Multiple Servers ──▶ Load Balancer ──▶ Shared Redis Cache

High Traffic (> 1000 req/day):
  Job Queue (Bull) ──▶ Worker Pool ──▶ Result Storage
       │                    │
       └─ Redis ────────────┘
```

## Monitoring Points

```
┌─────────────┐
│  Metrics    │
├─────────────┤
│ • Requests  │───▶ Alert if > 50/min
│ • Errors    │───▶ Alert if > 10%
│ • Duration  │───▶ Alert if > 45s avg
│ • Memory    │───▶ Alert if > 80%
└─────────────┘

┌─────────────┐
│  Logs       │
├─────────────┤
│ • Scans     │───▶ Audit trail
│ • Errors    │───▶ Debug info
│ • Security  │───▶ Incident response
└─────────────┘
```

---

**Architecture Version**: 1.0
**Last Updated**: December 3, 2025
**Status**: Production Ready
