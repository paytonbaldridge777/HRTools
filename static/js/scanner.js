/**
 * Accessibility Scanner - Client-side implementation
 * Uses axe-core, mammoth.js, PDF.js, and Tesseract.js loaded from CDNs
 * All processing happens in the browser - no server required
 */

// Library CDN URLs
const LIBS = {
    axeCore: 'https://cdn.jsdelivr.net/npm/axe-core@4.8.3/axe.min.js',
    mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js',
    pdfjs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    pdfjsWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
    tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js'
};

// Loaded library tracking
const loadedLibs = {
    axe: false,
    mammoth: false,
    pdfjs: false,
    tesseract: false
};

// State management
let currentScanResults = null;
let currentFile = null;

/**
 * Load a library from CDN dynamically
 */
async function loadLibrary(name, url) {
    if (loadedLibs[name]) {
        return;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            loadedLibs[name] = true;
            console.log(`Loaded ${name} from CDN`);
            resolve();
        };
        script.onerror = () => {
            reject(new Error(`Failed to load ${name} from ${url}`));
        };
        document.head.appendChild(script);
    });
}

/**
 * Initialize UI event listeners
 */
function initUI() {
    // Tab navigation
    const tabFile = document.getElementById('tab-file');
    const tabUrl = document.getElementById('tab-url');
    const panelFile = document.getElementById('panel-file');
    const panelUrl = document.getElementById('panel-url');

    tabFile.addEventListener('click', () => {
        tabFile.setAttribute('aria-selected', 'true');
        tabUrl.setAttribute('aria-selected', 'false');
        panelFile.classList.remove('hidden');
        panelUrl.classList.add('hidden');
    });

    tabUrl.addEventListener('click', () => {
        tabUrl.setAttribute('aria-selected', 'true');
        tabFile.setAttribute('aria-selected', 'false');
        panelUrl.classList.remove('hidden');
        panelFile.classList.add('hidden');
    });

    // File input handling
    const fileInput = document.getElementById('file-input');
    const scanFileBtn = document.getElementById('scan-file-btn');

    fileInput.addEventListener('change', (e) => {
        currentFile = e.target.files[0];
        scanFileBtn.disabled = !currentFile;
    });

    scanFileBtn.addEventListener('click', () => {
        if (currentFile) {
            handleFileUpload(currentFile);
        }
    });

    // URL input handling
    const urlInput = document.getElementById('url-input');
    const scanUrlBtn = document.getElementById('scan-url-btn');

    urlInput.addEventListener('input', (e) => {
        scanUrlBtn.disabled = !e.target.value.trim();
    });

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && urlInput.value.trim()) {
            handleUrlScan(urlInput.value.trim());
        }
    });

    scanUrlBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            handleUrlScan(url);
        }
    });

    // Results actions
    const downloadJsonBtn = document.getElementById('download-json-btn');
    const newScanBtn = document.getElementById('new-scan-btn');

    downloadJsonBtn.addEventListener('click', downloadResults);
    newScanBtn.addEventListener('click', resetScanner);

    // Attempt to fetch and insert site header
    fetchSiteHeader();
}

/**
 * Attempt to fetch the site's header from root
 */
async function fetchSiteHeader() {
    try {
        // TODO: If this site uses Astro SSG, the header might be baked into the index.html
        // For now, we'll use the fallback header that's already in scanner.html
        // In a production setup, you might want to extract the header component
        // or use a shared template approach
        console.log('Using fallback header - integration with Astro header would require server-side rendering or shared components');
    } catch (error) {
        console.log('Using fallback header:', error.message);
    }
}

/**
 * Show progress UI
 */
function showProgress(message, percent = 0, detail = '') {
    const progressSection = document.getElementById('progress-section');
    const progressMessage = document.getElementById('progress-message');
    const progressBar = document.getElementById('progress-bar');
    const progressDetail = document.getElementById('progress-detail');
    const errorSection = document.getElementById('error-section');
    const resultsSection = document.getElementById('results-section');

    progressSection.classList.remove('hidden');
    errorSection.classList.add('hidden');
    resultsSection.classList.add('hidden');

    progressMessage.textContent = message;
    progressBar.style.width = `${percent}%`;
    progressDetail.textContent = detail;
}

/**
 * Show error UI
 */
function showError(message) {
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    const progressSection = document.getElementById('progress-section');
    const resultsSection = document.getElementById('results-section');

    errorSection.classList.remove('hidden');
    progressSection.classList.add('hidden');
    resultsSection.classList.add('hidden');

    errorMessage.textContent = message;
}

/**
 * Show results UI
 */
function showResults(results) {
    const progressSection = document.getElementById('progress-section');
    const errorSection = document.getElementById('error-section');
    const resultsSection = document.getElementById('results-section');

    progressSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    currentScanResults = results;

    // Update summary counts
    document.getElementById('violations-count').textContent = results.violations.length;
    document.getElementById('incomplete-count').textContent = results.incomplete.length;
    document.getElementById('passes-count').textContent = results.passes.length;

    // Display violations
    displayViolations(results.violations);
}

/**
 * Display violation details
 */
function displayViolations(violations) {
    const violationsList = document.getElementById('violations-list');
    violationsList.innerHTML = '';

    if (violations.length === 0) {
        violationsList.innerHTML = '<p class="text-green-700 font-medium">No violations found! 🎉</p>';
        return;
    }

    violations.forEach((violation, index) => {
        const card = document.createElement('div');
        card.className = `violation-card ${violation.impact} border rounded-lg p-4 bg-white`;

        const impactColors = {
            critical: 'bg-red-100 text-red-800',
            serious: 'bg-orange-100 text-orange-800',
            moderate: 'bg-yellow-100 text-yellow-800',
            minor: 'bg-blue-100 text-blue-800'
        };

        card.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <h3 class="font-bold text-lg text-gray-900">
                    ${index + 1}. ${escapeHtml(violation.help)}
                </h3>
                <span class="px-2 py-1 rounded text-xs font-semibold ${impactColors[violation.impact] || 'bg-gray-100 text-gray-800'}">
                    ${violation.impact.toUpperCase()}
                </span>
            </div>
            <p class="text-sm text-gray-600 mb-3">${escapeHtml(violation.description)}</p>
            <div class="mb-3">
                <strong class="text-sm text-gray-700">Rule ID:</strong>
                <code class="text-sm bg-gray-100 px-2 py-1 rounded">${escapeHtml(violation.id)}</code>
            </div>
            <div class="mb-3">
                <strong class="text-sm text-gray-700">Affected nodes:</strong>
                <span class="text-sm text-gray-600">${violation.nodes.length}</span>
            </div>
            <details class="mt-3">
                <summary class="cursor-pointer text-sm font-medium text-tamu-maroon hover:underline">
                    View affected elements
                </summary>
                <div class="mt-2 space-y-2 pl-4">
                    ${violation.nodes.slice(0, 5).map((node, idx) => `
                        <div class="text-sm">
                            <div class="font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200 mb-1">
                                ${escapeHtml(node.target.join(', '))}
                            </div>
                            ${node.html ? `<div class="text-gray-600 text-xs truncate">${escapeHtml(node.html.substring(0, 100))}...</div>` : ''}
                        </div>
                    `).join('')}
                    ${violation.nodes.length > 5 ? `<div class="text-sm text-gray-500 italic">...and ${violation.nodes.length - 5} more</div>` : ''}
                </div>
            </details>
            <div class="mt-3">
                <a href="${violation.helpUrl}" target="_blank" rel="noopener noreferrer" class="text-sm text-tamu-maroon hover:underline">
                    Learn more →
                </a>
            </div>
        `;

        violationsList.appendChild(card);
    });
}

/**
 * Handle file upload and processing
 */
async function handleFileUpload(file) {
    showProgress('Preparing to scan file...', 10);

    try {
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
            await processHtmlFile(file);
        } else if (fileName.endsWith('.docx')) {
            await processDocxFile(file);
        } else if (fileName.endsWith('.pdf')) {
            await processPdfFile(file);
        } else if (fileName.match(/\.(png|jpg|jpeg|gif|bmp)$/)) {
            await processImageFile(file);
        } else {
            throw new Error('Unsupported file type. Please upload HTML, DOCX, PDF, or image files.');
        }
    } catch (error) {
        console.error('Error processing file:', error);
        showError(`Error processing file: ${error.message}`);
    }
}

/**
 * Process HTML file
 */
async function processHtmlFile(file) {
    showProgress('Reading HTML file...', 20);

    const text = await file.text();
    showProgress('Loading accessibility scanner...', 40);

    await loadLibrary('axe', LIBS.axeCore);
    showProgress('Scanning HTML for accessibility issues...', 60);

    // Create a temporary container to hold the HTML
    const container = document.createElement('div');
    container.innerHTML = text;
    container.style.display = 'none';
    document.body.appendChild(container);

    try {
        const results = await axe.run(container);
        showProgress('Scan complete!', 100);
        showResults(results);
    } finally {
        document.body.removeChild(container);
    }
}

/**
 * Process DOCX file
 */
async function processDocxFile(file) {
    showProgress('Loading document converter...', 20);
    await loadLibrary('mammoth', LIBS.mammoth);

    showProgress('Converting DOCX to HTML...', 40);
    const arrayBuffer = await file.arrayBuffer();

    try {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;

        if (result.messages.length > 0) {
            console.warn('Mammoth conversion warnings:', result.messages);
        }

        showProgress('Loading accessibility scanner...', 60);
        await loadLibrary('axe', LIBS.axeCore);

        showProgress('Scanning converted document...', 80);
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.display = 'none';
        document.body.appendChild(container);

        try {
            const scanResults = await axe.run(container);
            showProgress('Scan complete!', 100);
            showResults(scanResults);
        } finally {
            document.body.removeChild(container);
        }
    } catch (error) {
        throw new Error(`Failed to convert DOCX: ${error.message}`);
    }
}

/**
 * Process PDF file
 */
async function processPdfFile(file) {
    showProgress('Loading PDF processor...', 20);
    await loadLibrary('pdfjs', LIBS.pdfjs);

    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfjsWorker;

    showProgress('Reading PDF file...', 30);
    const arrayBuffer = await file.arrayBuffer();

    try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        showProgress(`Extracting text from ${numPages} pages...`, 40);

        let allText = '';
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText += `\n\n--- Page ${i} ---\n\n${pageText}`;

            const progress = 40 + (40 * i / numPages);
            showProgress(`Extracting text from page ${i} of ${numPages}...`, progress);
        }

        showProgress('Loading accessibility scanner...', 85);
        await loadLibrary('axe', LIBS.axeCore);

        showProgress('Scanning PDF content...', 90);
        
        // Create a container with the extracted text
        const container = document.createElement('div');
        container.setAttribute('role', 'document');
        
        // Split into paragraphs and create proper structure
        const paragraphs = allText.split('\n\n').filter(p => p.trim());
        paragraphs.forEach(para => {
            const p = document.createElement('p');
            p.textContent = para.trim();
            container.appendChild(p);
        });
        
        container.style.display = 'none';
        document.body.appendChild(container);

        // Add notice about PDF limitations
        const notice = document.createElement('div');
        notice.className = 'bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800';
        notice.innerHTML = '<strong>PDF Note:</strong> This scan analyzed the text content extracted from the PDF. Layout-based accessibility checks (such as reading order, table structure, and form fields) are limited. For comprehensive PDF accessibility testing, use specialized PDF accessibility tools.';
        
        try {
            const scanResults = await axe.run(container);
            showProgress('Scan complete!', 100);
            
            // Insert notice before showing results
            setTimeout(() => {
                const resultsSection = document.getElementById('results-section');
                if (resultsSection && resultsSection.querySelector('.bg-white')) {
                    resultsSection.querySelector('.bg-white').insertAdjacentElement('beforebegin', notice);
                }
            }, 100);
            
            showResults(scanResults);
        } finally {
            document.body.removeChild(container);
        }
    } catch (error) {
        throw new Error(`Failed to process PDF: ${error.message}`);
    }
}

/**
 * Process image file (with OCR)
 */
async function processImageFile(file) {
    showProgress('Loading OCR engine (this may take a moment)...', 10);
    await loadLibrary('tesseract', LIBS.tesseract);

    showProgress('Initializing OCR worker...', 20);

    try {
        const worker = await Tesseract.createWorker('eng');

        showProgress('Performing OCR on image (this may take a while)...', 30, 'Processing...');

        // Create image URL for Tesseract
        const imageUrl = URL.createObjectURL(file);

        const result = await worker.recognize(imageUrl, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const progress = 30 + (50 * m.progress);
                    showProgress('Performing OCR on image...', progress, `${Math.round(m.progress * 100)}% complete`);
                }
            }
        });

        URL.revokeObjectURL(imageUrl);
        await worker.terminate();

        const text = result.data.text;

        if (!text || text.trim().length < 10) {
            throw new Error('Could not extract sufficient text from image. The image may not contain readable text or may be too low quality.');
        }

        showProgress('Loading accessibility scanner...', 85);
        await loadLibrary('axe', LIBS.axeCore);

        showProgress('Scanning OCR content...', 90);

        // Create a container with the extracted text
        const container = document.createElement('div');
        container.setAttribute('role', 'document');
        
        // Create paragraphs from text
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        paragraphs.forEach(para => {
            const p = document.createElement('p');
            p.textContent = para.trim();
            container.appendChild(p);
        });
        
        container.style.display = 'none';
        document.body.appendChild(container);

        // Add notice about OCR limitations
        const notice = document.createElement('div');
        notice.className = 'bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800';
        notice.innerHTML = '<strong>OCR Note:</strong> This scan analyzed text extracted from the image using OCR. The accuracy depends on image quality. Layout, structure, and non-text content checks are not possible. This is a best-effort analysis.';

        try {
            const scanResults = await axe.run(container);
            showProgress('Scan complete!', 100);
            
            // Insert notice before showing results
            setTimeout(() => {
                const resultsSection = document.getElementById('results-section');
                if (resultsSection && resultsSection.querySelector('.bg-white')) {
                    resultsSection.querySelector('.bg-white').insertAdjacentElement('beforebegin', notice);
                }
            }, 100);
            
            showResults(scanResults);
        } finally {
            document.body.removeChild(container);
        }
    } catch (error) {
        throw new Error(`Failed to process image: ${error.message}`);
    }
}

/**
 * Handle URL scanning
 */
async function handleUrlScan(url) {
    showProgress('Fetching URL...', 20);

    try {
        // Validate URL
        new URL(url); // Throws if invalid

        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        showProgress('Loading accessibility scanner...', 60);
        await loadLibrary('axe', LIBS.axeCore);

        showProgress('Scanning page for accessibility issues...', 80);

        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.display = 'none';
        document.body.appendChild(container);

        try {
            const results = await axe.run(container);
            showProgress('Scan complete!', 100);
            showResults(results);
        } finally {
            document.body.removeChild(container);
        }
    } catch (error) {
        console.error('Error fetching URL:', error);

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showError(
                `Cannot fetch URL due to CORS restrictions. Cross-origin requests are blocked by the browser for security reasons.\n\n` +
                `Suggestions:\n` +
                `• Download the HTML file and upload it instead\n` +
                `• Use a browser extension that allows CORS\n` +
                `• Use a server-side accessibility scanner for external URLs\n` +
                `• Consider tools like WAVE or Lighthouse for full site scans`
            );
        } else {
            showError(`Error scanning URL: ${error.message}`);
        }
    }
}

/**
 * Download results as JSON
 */
function downloadResults() {
    if (!currentScanResults) {
        return;
    }

    const dataStr = JSON.stringify(currentScanResults, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-scan-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Reset scanner for new scan
 */
function resetScanner() {
    currentScanResults = null;
    currentFile = null;

    document.getElementById('file-input').value = '';
    document.getElementById('url-input').value = '';
    document.getElementById('scan-file-btn').disabled = true;
    document.getElementById('scan-url-btn').disabled = true;

    document.getElementById('progress-section').classList.add('hidden');
    document.getElementById('error-section').classList.add('hidden');
    document.getElementById('results-section').classList.add('hidden');

    // Remove any notices that were added
    document.querySelectorAll('.bg-yellow-50').forEach(notice => {
        if (notice.textContent.includes('PDF Note:') || notice.textContent.includes('OCR Note:')) {
            notice.remove();
        }
    });
}

/**
 * Utility: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
} else {
    initUI();
}
