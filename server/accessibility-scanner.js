/**
 * Accessibility Scanner Server
 * 
 * A Node.js Express server that provides accessibility scanning using pa11y (WCAG 2.1 Level AA)
 * 
 * Security Features:
 * - URL whitelisting to prevent SSRF attacks
 * - Rate limiting to prevent abuse
 * - Request timeouts to prevent resource exhaustion
 * - CORS configuration
 * - Helmet for security headers
 * 
 * Operational Notes:
 * - Designed for internal use behind authentication
 * - Should be deployed behind a reverse proxy (nginx/CloudFlare)
 * - Monitor memory usage as headless browser can be resource-intensive
 * - Consider implementing request queuing for high traffic
 */

import express from 'express';
import pa11y from 'pa11y';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Security: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow for embedded usage
}));

// CORS configuration - restrict in production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:4321', 'http://localhost:3000'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());

// Rate limiting: max 10 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many scan requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/scan', limiter);

/**
 * URL Whitelist Configuration
 * 
 * SECURITY: Only allow scanning of approved domains to prevent SSRF attacks
 * Configure via environment variable or modify this list
 */
const getAllowedDomains = () => {
  if (process.env.ALLOWED_DOMAINS) {
    return process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim());
  }
  
  // Default whitelist - modify for your organization
  return [
    'localhost',
    '127.0.0.1',
    'law.tamu.edu',
    // Add your internal domains here
  ];
};

/**
 * Validate if a URL is allowed to be scanned
 */
const isUrlAllowed = (urlString) => {
  try {
    const url = new URL(urlString);
    const allowedDomains = getAllowedDomains();
    
    // Check if the hostname matches or is a subdomain of allowed domains
    return allowedDomains.some(domain => {
      return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
    });
  } catch {
    return false;
  }
};

/**
 * POST /api/scan
 * 
 * Scan a URL for accessibility issues using pa11y (WCAG 2.1 Level AA)
 * 
 * Body:
 *   - url: string (required) - URL to scan
 *   - timeout: number (optional) - Max timeout in ms (default: 30000, max: 60000)
 * 
 * Returns:
 *   - issues: array of accessibility violations
 *   - documentTitle: string
 *   - pageUrl: string
 *   - standard: string (WCAG2AA)
 */
app.post('/api/scan', async (req, res) => {
  const { url, timeout = 30000 } = req.body;
  
  // Validation
  if (!url) {
    return res.status(400).json({ 
      error: 'URL is required',
      message: 'Please provide a URL to scan'
    });
  }
  
  // URL format validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ 
      error: 'Invalid URL format',
      message: 'Please provide a valid URL (e.g., https://example.com)'
    });
  }
  
  // Security: Whitelist check
  if (!isUrlAllowed(url)) {
    return res.status(403).json({ 
      error: 'Domain not allowed',
      message: 'This domain is not in the approved whitelist. Contact your administrator to add it.',
      allowedDomains: getAllowedDomains()
    });
  }
  
  // Timeout validation (max 60 seconds)
  const scanTimeout = Math.min(Math.max(timeout, 5000), 60000);
  
  try {
    console.log(`[Accessibility Scan] Starting scan for: ${url}`);
    const startTime = Date.now();
    
    // Configure pa11y with WCAG 2.1 Level AA standard
    const results = await pa11y(url, {
      standard: 'WCAG2AA',
      timeout: scanTimeout,
      wait: 1000, // Wait 1s for page to fully load
      chromeLaunchConfig: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Overcome limited resource problems
          '--disable-gpu',
        ]
      },
      // Include additional tests
      runners: ['axe'],
      screenCapture: false, // Don't capture screenshots for performance
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Accessibility Scan] Completed in ${duration}ms - Found ${results.issues.length} issues`);
    
    // Process and categorize issues
    const processedIssues = results.issues.map(issue => ({
      code: issue.code,
      type: issue.type, // error, warning, notice
      typeCode: issue.typeCode, // 1=error, 2=warning, 3=notice
      message: issue.message,
      context: issue.context,
      selector: issue.selector,
      runner: issue.runner,
      // Map type to severity for consistency
      severity: mapTypeToSeverity(issue.type, issue.typeCode),
      // Map to WCAG principle
      principle: extractPrinciple(issue.code),
      wcag: formatWCAGCode(issue.code),
    }));
    
    // Calculate statistics
    const stats = {
      total: processedIssues.length,
      errors: processedIssues.filter(i => i.typeCode === 1).length,
      warnings: processedIssues.filter(i => i.typeCode === 2).length,
      notices: processedIssues.filter(i => i.typeCode === 3).length,
    };
    
    res.json({
      success: true,
      url: results.pageUrl,
      documentTitle: results.documentTitle,
      standard: 'WCAG 2.1 Level AA',
      issues: processedIssues,
      stats,
      scanDuration: duration,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Accessibility Scan] Error:', error.message);
    
    // Handle timeout errors
    if (error.message.includes('timeout') || error.message.includes('TimeoutError')) {
      return res.status(504).json({
        error: 'Scan timeout',
        message: `The scan took too long to complete. The page may be too large or slow to load.`,
        details: error.message,
      });
    }
    
    // Handle network errors
    if (error.message.includes('net::ERR') || error.message.includes('Navigation failed')) {
      return res.status(502).json({
        error: 'Failed to reach URL',
        message: 'Could not connect to the specified URL. Please check that the URL is accessible.',
        details: error.message,
      });
    }
    
    // Generic error
    res.status(500).json({
      error: 'Scan failed',
      message: 'An error occurred while scanning the URL',
      details: error.message,
    });
  }
});

/**
 * Map pa11y issue types to severity levels
 */
const mapTypeToSeverity = (type, typeCode) => {
  // typeCode: 1 = error, 2 = warning, 3 = notice
  if (typeCode === 1) return 'critical';
  if (typeCode === 2) return 'serious';
  return 'moderate';
};

/**
 * Extract WCAG principle from issue code
 */
const extractPrinciple = (code) => {
  if (!code) return 'Unknown';
  
  // WCAG principles: 1=Perceivable, 2=Operable, 3=Understandable, 4=Robust
  if (code.startsWith('WCAG2AA.Principle1') || code.includes('.1.')) {
    return 'Perceivable';
  } else if (code.startsWith('WCAG2AA.Principle2') || code.includes('.2.')) {
    return 'Operable';
  } else if (code.startsWith('WCAG2AA.Principle3') || code.includes('.3.')) {
    return 'Understandable';
  } else if (code.startsWith('WCAG2AA.Principle4') || code.includes('.4.')) {
    return 'Robust';
  }
  
  return 'General';
};

/**
 * Format WCAG code for display (e.g., "WCAG 2.1 - 1.4.3")
 */
const formatWCAGCode = (code) => {
  if (!code) return 'N/A';
  
  // Extract WCAG criterion number (e.g., "1.4.3" from code)
  const match = code.match(/(\d+\.\d+\.\d+)/);
  if (match) {
    return `WCAG 2.1 - ${match[1]}`;
  }
  
  return code.split('.')[0] || code;
};

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'accessibility-scanner',
    version: '1.0.0',
  });
});

/**
 * Root endpoint with API info
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Accessibility Scanner API',
    version: '1.0.0',
    endpoints: {
      scan: 'POST /api/scan',
      health: 'GET /health',
    },
    documentation: {
      scan: {
        method: 'POST',
        path: '/api/scan',
        body: {
          url: 'string (required) - URL to scan',
          timeout: 'number (optional) - Max timeout in ms (default: 30000, max: 60000)',
        },
        rateLimit: '10 requests per minute per IP',
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔍 Accessibility Scanner Server                            ║
║                                                               ║
║   Status: Running                                             ║
║   Port: ${PORT}                                                  ║
║   Standard: WCAG 2.1 Level AA                                ║
║                                                               ║
║   Endpoints:                                                  ║
║   - POST /api/scan     Scan URL for accessibility issues    ║
║   - GET  /health       Health check                          ║
║                                                               ║
║   Security Features:                                          ║
║   - URL Whitelisting   ✓                                     ║
║   - Rate Limiting      ✓                                     ║
║   - Request Timeouts   ✓                                     ║
║                                                               ║
║   Allowed Domains: ${getAllowedDomains().join(', ')}${' '.repeat(Math.max(0, 30 - getAllowedDomains().join(', ').length))}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
