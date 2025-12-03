# Client-Side Accessibility Scanner

A **standalone, client-side** accessibility scanner that runs entirely in the user's browser. This is different from the existing server-side accessibility checker tool.

## Differences from Existing Accessibility Checker

| Feature | Client-Side Scanner (`/Accessibility/`) | Server-Side Checker (`/tools/accessibility-checker`) |
|---------|---------------------------------------|-----------------------------------------------------|
| **Processing** | Browser-only, no server | Requires Node.js server with pa11y |
| **File Support** | HTML, DOCX, PDF, Images (OCR) | URLs only |
| **Privacy** | Files never leave browser | URLs are accessed by server |
| **Deployment** | Static file (CDN-friendly) | Requires server deployment |
| **Dependencies** | CDN-loaded libraries | Server packages (puppeteer, pa11y) |
| **Performance** | Limited by client device | Dedicated server resources |

## Usage

### Accessing the Scanner

Navigate to `/Accessibility/` on the deployed site (e.g., `https://hrtools.law.tamu.edu/Accessibility/`).

### Scanning Files

1. **HTML Files:**
   - Direct upload and analysis
   - Results typically in < 1 second

2. **DOCX Files:**
   - Converted to HTML using mammoth.js
   - Results in 2-5 seconds

3. **PDF Files:**
   - Text extraction using PDF.js
   - Layout analysis limited
   - Results in 5-15 seconds

4. **Images:**
   - OCR using Tesseract.js
   - Very CPU-intensive
   - Results in 30-60 seconds

### Scanning URLs

- Subject to CORS browser restrictions
- If blocked, download the HTML file and upload instead
- For comprehensive URL scanning, use the server-side tool at `/tools/accessibility-checker`

## Technical Implementation

### Libraries (Loaded from CDN)

```javascript
const LIBS = {
    axeCore: 'https://cdn.jsdelivr.net/npm/axe-core@4.8.3/axe.min.js',
    mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js',
    pdfjs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js'
};
```

Libraries are **lazy-loaded** only when needed:
- axe-core: Loaded for all scans
- mammoth.js: Only when DOCX file selected
- PDF.js: Only when PDF file selected
- Tesseract.js: Only when image file selected

### File Structure

```
public/
├── Accessibility/
│   └── index.html        # Main scanner page
└── static/
    ├── css/
    │   └── scanner.css   # Styles
    └── js/
        └── scanner.js    # Scanner logic
```

### Build Process

Files are automatically copied from `public/` to `dist/` during Astro build:

```bash
npm run build
# Output: dist/Accessibility/index.html, dist/static/js/scanner.js, dist/static/css/scanner.css
```

## Features

### Scan Results

- **Violation Count:** Grouped by severity (critical, serious, moderate, minor)
- **Incomplete Checks:** Rules that require manual review
- **Passed Checks:** Successfully validated rules
- **Detailed Information:** 
  - Rule ID and description
  - Affected HTML elements
  - Links to axe-core documentation
  - Code snippets showing violations

### Export Options

- Download raw JSON results for:
  - Integration with other tools
  - Historical tracking
  - Custom reporting

### Progress Indicators

- Real-time progress updates
- Percentage complete
- Detailed status messages
- Especially helpful for OCR (long-running)

## Limitations

### PDF Scanning

- ⚠️ **Text-only analysis:** Only extracted text is scanned
- ⚠️ **No layout analysis:** Reading order, tables, forms not tested
- ⚠️ **Limited accuracy:** Complex structures may be lost
- ✅ **Recommendation:** Use specialized PDF accessibility tools (Adobe Acrobat Pro, PAC 3) for comprehensive testing

### Image Scanning (OCR)

- ⚠️ **Text-only:** Visual elements not analyzed
- ⚠️ **Accuracy varies:** Depends on image quality, font, resolution
- ⚠️ **Slow processing:** Can take 30-60 seconds
- ⚠️ **No structure:** Layout and semantic structure lost
- ✅ **Recommendation:** Best for extracting text from scanned documents, not for comprehensive accessibility testing

### URL Scanning

- ⚠️ **CORS restrictions:** Many sites block cross-origin requests
- ⚠️ **Limited scope:** Only the specific URL, no linked pages
- ⚠️ **Authentication:** Cannot access logged-in areas
- ✅ **Recommendation:** Use server-side checker at `/tools/accessibility-checker` for comprehensive URL scanning

## Security & Privacy

### Data Privacy

✅ **All processing in browser:**
- Files are never uploaded to a server
- No network transmission of file contents
- Safe for confidential documents

✅ **XSS Protection:**
- All user-generated content properly escaped
- Safe DOM manipulation throughout
- Isolated testing containers

### What Gets Transmitted

Only CDN library loading:
- axe-core JavaScript
- mammoth.js JavaScript
- PDF.js JavaScript
- Tesseract.js JavaScript and language data

## Browser Compatibility

**Supported:**
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Requirements:**
- JavaScript enabled
- WebAssembly support (for Tesseract.js)
- Modern ES2017+ features

## Performance Tips

1. **For Large PDFs:**
   - Extract text separately if possible
   - Consider page-by-page analysis
   - Expect 1-2 seconds per page

2. **For Images:**
   - Optimize resolution (300-600 DPI is sufficient)
   - Use high-contrast, clear text
   - JPEG/PNG work best
   - Avoid overly large files (> 5MB)

3. **For DOCX:**
   - Simple formatting converts best
   - Complex tables may have issues
   - Images in DOCX are lost in conversion

## Future Enhancements

Potential improvements for future versions:

- [ ] Batch file scanning (multiple files at once)
- [ ] Astro component version for better header integration
- [ ] Persistent scan history (localStorage)
- [ ] Comparison reports (before/after)
- [ ] Additional export formats (PDF, Word)
- [ ] Custom rule configuration
- [ ] Integration with CI/CD pipelines

## When to Use Which Tool

### Use Client-Side Scanner (`/Accessibility/`) when:

- ✅ Scanning confidential documents
- ✅ Testing DOCX, PDF, or image files
- ✅ No server available
- ✅ Working offline (after initial load)
- ✅ Quick, one-off scans

### Use Server-Side Checker (`/tools/accessibility-checker`) when:

- ✅ Scanning public URLs
- ✅ Need to bypass CORS
- ✅ Comprehensive site analysis
- ✅ Regular/scheduled scans
- ✅ Team collaboration needed

## Support

For issues or questions:
- Check browser console for errors
- Verify browser compatibility
- Ensure JavaScript is enabled
- Try a different file format

## License

Part of the TAMU School of Law HR Tools suite.
Copyright © 2024 Texas A&M University School of Law. All rights reserved.
