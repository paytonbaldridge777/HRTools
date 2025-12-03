# HR Tools

A unified web application for HR operations at TAMU School of Law. This project consolidates multiple HR tools into a single, modern, scalable site with a shared design system.

## Tools

- **FMLA Calculator** - Calculate FMLA eligibility and leave details
- **TrainTraq Reminders** - Manage and track training reminder schedules
- **Onboarding Tracker** - Track onboarding tasks and progress
- **Accessibility Checker** - Real-time WCAG 2.1 Level AA compliance scanning using pa11y

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome/Chromium (for accessibility scanner)

### Installation

```bash
npm install
```

### Development

**Run the frontend:**

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

**Run the accessibility scanner server (optional):**

```bash
npm run server
```

The scanner API will be available at http://localhost:3001

### Building for Production

```bash
npm run build
```

The static site will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
HRTools/
├── public/              # Static assets
│   ├── icons/          # Tool icons
│   └── favicon.svg     # Site favicon
├── server/             # Accessibility scanner backend
│   ├── accessibility-scanner.js  # Express server with pa11y
│   ├── package.json    # Server dependencies
│   ├── .env.example    # Environment configuration template
│   └── README.md       # Server documentation
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ToolCard.astro
│   │   ├── SearchInput.astro
│   │   └── AccessibilityChecker.tsx  # React component for scanner
│   ├── content/        # Content data
│   │   └── tools.json  # Tool metadata
│   ├── layouts/        # Page layouts
│   │   └── BaseLayout.astro
│   ├── pages/          # Routes (file-based routing)
│   │   ├── index.astro
│   │   └── tools/      # Tool pages
│   └── styles/         # Global styles
│       └── globals.css
├── docs/               # Documentation
│   └── ACCESSIBILITY_SCANNER.md  # Complete scanner docs
├── astro.config.mjs    # Astro configuration
├── tailwind.config.mjs # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Accessibility Scanner

The Accessibility Checker tool provides **real-time WCAG 2.1 Level AA compliance scanning** using pa11y.

### Running the Scanner

1. **Start the server:**
   ```bash
   npm run server
   # or with auto-reload:
   npm run server:dev
   ```

2. **Configure environment (optional):**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env to set allowed domains
   ```

3. **Access the tool:**
   - Navigate to http://localhost:4321/tools/accessibility-checker
   - Enter a URL to scan
   - View real-time results

### Security Features

- ✅ URL whitelisting (SSRF prevention)
- ✅ Rate limiting (10 requests/min per IP)
- ✅ Request timeouts (max 60s)
- ✅ CORS configuration
- ✅ Security headers

### Documentation

See [`docs/ACCESSIBILITY_SCANNER.md`](docs/ACCESSIBILITY_SCANNER.md) for:
- Complete security considerations
- Deployment architecture
- CI/CD integration examples
- Troubleshooting guide

## Deployment

### Static Site (Cloudflare Pages)

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `dist`
4. Deploy

### Accessibility Scanner Server

Deploy separately on a platform supporting Node.js:
- Railway.app
- Render.com
- AWS ECS/EKS
- Digital Ocean App Platform

**Environment variables to set:**
```bash
PORT=3001
ALLOWED_DOMAINS=law.tamu.edu,yourdomain.com
ALLOWED_ORIGINS=https://hrtools.law.tamu.edu
NODE_ENV=production
```

**Note:** Remove `localhost` and `127.0.0.1` from `ALLOWED_DOMAINS` in production!

### Cloudflare Access (Optional)

To protect the site with Cloudflare Access:

1. Navigate to your Cloudflare Dashboard
2. Go to Access > Applications
3. Create a new Self-hosted application
4. Set the domain to your HR Tools site
5. Configure authentication policies (e.g., email domain, GitHub, etc.)

## Tech Stack

- **Framework**: Astro with React integration
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Backend**: Express.js
- **Accessibility**: pa11y (Puppeteer + axe-core)
- **Deployment**: Cloudflare Pages (frontend) + Node.js hosting (backend)

## Features

- 🎨 Modern, clean, accessible design
- 🌓 Dark mode support
- 📱 Mobile-first responsive layout
- 🔍 Client-side search functionality
- 🏷️ Tag-based filtering
- ♿ Real-time WCAG 2.1 AA accessibility scanning
- 🚀 Optimized for performance
- 📦 Shared header and footer across all tools

## Contributing

This is an internal tool for TAMU School of Law HR operations.

## License

Copyright © 2025 Texas A&M University School of Law. All rights reserved.
