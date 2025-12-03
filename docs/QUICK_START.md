# Quick Start Guide - Accessibility Scanner

Get the accessibility scanner up and running in 5 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure the Server (Optional for Development)

For development, create a `.env` file in the `server` directory:

```bash
cd server
cp .env.example .env
```

Edit `.env` to include localhost for development:
```bash
ALLOWED_DOMAINS=localhost,127.0.0.1,law.tamu.edu
```

## Step 3: Start the Server

In one terminal:

```bash
npm run server
```

You should see:
```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔍 Accessibility Scanner Server                            ║
║                                                               ║
║   Status: Running                                             ║
║   Port: 3001                                                  ║
...
```

## Step 4: Start the Frontend

In another terminal:

```bash
npm run dev
```

## Step 5: Test the Scanner

1. Open http://localhost:4321/tools/accessibility-checker
2. Enter a URL (e.g., `http://localhost:4321`)
3. Click "Analyze Website"
4. View the results!

## Testing Without Starting the Frontend

You can test the API directly:

```bash
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://law.tamu.edu"}'
```

## Troubleshooting

### "Domain not allowed" error

Make sure your URL's domain is in the `ALLOWED_DOMAINS` list in `.env`:
```bash
ALLOWED_DOMAINS=localhost,127.0.0.1,law.tamu.edu,yoursite.com
```

### Server won't start

Check if port 3001 is already in use:
```bash
lsof -i :3001
# Kill the process using the port, or change PORT in .env
```

### "Failed to launch browser" error

Install Chromium:
```bash
# macOS
brew install chromium

# Ubuntu/Debian
sudo apt-get install chromium-browser

# Or let Puppeteer download it
cd server
npm install puppeteer
```

## Next Steps

- Read [`docs/ACCESSIBILITY_SCANNER.md`](ACCESSIBILITY_SCANNER.md) for complete documentation
- Configure security settings for production
- Set up deployment
- Integrate with CI/CD

## Common Commands

```bash
# Start server (with auto-reload)
npm run server:dev

# Start frontend
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Test the API
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:4321"}'

# Check server health
curl http://localhost:3001/health
```

## Production Deployment

### Static Site
Deploy to Cloudflare Pages, Vercel, or Netlify:
- Build command: `npm run build`
- Output directory: `dist`

### Scanner Server
Deploy to Railway, Render, or AWS:
- Start command: `cd server && npm start`
- Set environment variables:
  - `ALLOWED_DOMAINS=law.tamu.edu` (remove localhost!)
  - `ALLOWED_ORIGINS=https://yoursite.com`
  - `NODE_ENV=production`

### Connect Frontend to Server
Set environment variable in your static site:
- `PUBLIC_SCANNER_API_URL=https://your-scanner-api.com`

## Support

For issues, check:
1. Server logs in terminal
2. Browser console (F12)
3. [`docs/ACCESSIBILITY_SCANNER.md`](ACCESSIBILITY_SCANNER.md) troubleshooting section

---

Happy scanning! 🔍 ♿
