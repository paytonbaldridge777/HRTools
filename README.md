# HR Tools

A unified web application for HR operations at TAMU School of Law. This project consolidates multiple HR tools into a single, modern, scalable site with a shared design system.

## Tools

- **FMLA Calculator** - Calculate FMLA eligibility and leave details
- **TrainTraq Reminders** - Manage and track training reminder schedules
- **Onboarding Tracker** - Track onboarding tasks and progress

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

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
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ToolCard.astro
│   │   └── SearchInput.astro
│   ├── content/        # Content data
│   │   └── tools.json  # Tool metadata
│   ├── layouts/        # Page layouts
│   │   └── BaseLayout.astro
│   ├── pages/          # Routes (file-based routing)
│   │   ├── index.astro
│   │   └── tools/      # Tool pages
│   └── styles/         # Global styles
│       └── globals.css
├── astro.config.mjs    # Astro configuration
├── tailwind.config.mjs # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `dist`
4. Deploy

### Cloudflare Access (Optional)

To protect the site with Cloudflare Access:

1. Navigate to your Cloudflare Dashboard
2. Go to Access > Applications
3. Create a new Self-hosted application
4. Set the domain to your HR Tools site
5. Configure authentication policies (e.g., email domain, GitHub, etc.)

## Tech Stack

- **Framework**: Astro
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: Cloudflare Pages

## Features

- 🎨 Modern, clean, accessible design
- 🌓 Dark mode support
- 📱 Mobile-first responsive layout
- 🔍 Client-side search functionality
- 🏷️ Tag-based filtering
- ♿ WCAG 2.1 AA accessibility
- 🚀 Optimized for performance
- 📦 Shared header and footer across all tools

## Contributing

This is an internal tool for TAMU School of Law HR operations.

## License

Copyright © 2025 Texas A&M University School of Law. All rights reserved.
