const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Get the path to axe-core from node_modules
const axeCorePath = path.join(__dirname, 'node_modules', 'axe-core', 'axe.min.js');

/**
 * GET /scan?url=<target_url>
 * 
 * Server-side accessibility scanner using Puppeteer and axe-core.
 * Opens the target URL in a headless browser, waits for networkidle2,
 * injects axe-core, runs axe with WCAG tags, and returns raw JSON results.
 */
app.get('/scan', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({
            error: 'Missing required parameter: url',
            usage: 'GET /scan?url=<target_url>'
        });
    }

    // Basic URL validation
    let parsedUrl;
    try {
        parsedUrl = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error('Only HTTP/HTTPS URLs are allowed');
        }
    } catch (error) {
        return res.status(400).json({
            error: 'Invalid URL',
            message: error.message
        });
    }

    let browser = null;

    try {
        // Launch headless browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set a reasonable viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Navigate to the target URL and wait for network idle
        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Read axe-core from node_modules
        const axeSource = fs.readFileSync(axeCorePath, 'utf8');

        // Inject axe-core into the page
        await page.evaluate(axeSource);

        // Run axe with WCAG tags and all impacts
        const results = await page.evaluate(() => {
            return window.axe.run(document, {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21aa']
                },
                resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable']
            });
        });

        await browser.close();
        browser = null;

        // Return raw axe JSON results
        res.json(results);

    } catch (error) {
        console.error('Error during scan:', error);

        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }

        res.status(500).json({
            error: 'Scan failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'accessibility-scanner' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Accessibility scanner server running on http://localhost:${PORT}`);
    console.log(`Usage: GET /scan?url=<target_url>`);
    console.log(`Example: curl "http://localhost:${PORT}/scan?url=https://example.com"`);
});
