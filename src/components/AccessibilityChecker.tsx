import React, { useState } from 'react';

/**
 * AccessibilityChecker Component
 * 
 * A React component that provides real-time accessibility scanning using pa11y
 * via an Express backend API.
 * 
 * Features:
 * - URL scanning with WCAG 2.1 Level AA compliance checking
 * - Real-time results display with severity categorization
 * - Detailed issue information with WCAG criteria
 * - Export functionality for reports
 */

interface ScanIssue {
  code: string;
  type: string;
  typeCode: number;
  message: string;
  context: string;
  selector: string;
  runner: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  principle: string;
  wcag: string;
}

interface ScanResult {
  success: boolean;
  url: string;
  documentTitle: string;
  standard: string;
  issues: ScanIssue[];
  stats: {
    total: number;
    errors: number;
    warnings: number;
    notices: number;
  };
  scanDuration: number;
  timestamp: string;
}

const API_URL = import.meta.env.PUBLIC_SCANNER_API_URL || 'http://localhost:3001';

const AccessibilityChecker: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!url) {
      setError('Please enter a URL to scan');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    try {
      const response = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Scan failed');
      }

      setProgress(100);
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const calculateComplianceScore = (stats: ScanResult['stats']) => {
    const score = Math.max(0, 100 - (stats.errors * 10 + stats.warnings * 5 + stats.notices * 2));
    return Math.round(score);
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: '#dc2626',
      serious: '#ea580c',
      moderate: '#ca8a04',
      minor: '#0891b2',
    };
    return colors[severity as keyof typeof colors] || '#6b7280';
  };

  const downloadReport = () => {
    if (!result) return;

    const reportHTML = generateReportHTML(result);
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-report-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReportHTML = (data: ScanResult) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report - ${data.documentTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #111827;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { color: #500000; margin-bottom: 10px; }
    .meta { color: #6b7280; margin-bottom: 30px; font-size: 14px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
    .stat-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; }
    .stat-value { font-size: 32px; font-weight: bold; }
    .issue-card {
      border: 1px solid #e5e7eb;
      border-left: 4px solid;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .severity-critical { border-left-color: #dc2626; background: #fef2f2; }
    .severity-serious { border-left-color: #ea580c; background: #fff7ed; }
    .severity-moderate { border-left-color: #ca8a04; background: #fefce8; }
    .severity-minor { border-left-color: #0891b2; background: #ecfeff; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
      color: white;
    }
    .section { margin: 15px 0; }
    .section-title { font-weight: 600; margin-bottom: 5px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Accessibility Report</h1>
  <div class="meta">
    <strong>URL:</strong> ${data.url}<br>
    <strong>Document Title:</strong> ${data.documentTitle}<br>
    <strong>Standard:</strong> ${data.standard}<br>
    <strong>Scan Date:</strong> ${new Date(data.timestamp).toLocaleString()}<br>
    <strong>Duration:</strong> ${data.scanDuration}ms
  </div>
  
  <div class="stats">
    <div class="stat-card">
      <div style="color: #6b7280; font-size: 14px;">Total Issues</div>
      <div class="stat-value">${data.stats.total}</div>
    </div>
    <div class="stat-card">
      <div style="color: #6b7280; font-size: 14px;">Errors</div>
      <div class="stat-value" style="color: #dc2626;">${data.stats.errors}</div>
    </div>
    <div class="stat-card">
      <div style="color: #6b7280; font-size: 14px;">Warnings</div>
      <div class="stat-value" style="color: #ea580c;">${data.stats.warnings}</div>
    </div>
    <div class="stat-card">
      <div style="color: #6b7280; font-size: 14px;">Notices</div>
      <div class="stat-value" style="color: #ca8a04;">${data.stats.notices}</div>
    </div>
  </div>

  <h2>Issues Found (${data.issues.length})</h2>
  ${data.issues.map((issue, index) => `
    <div class="issue-card severity-${issue.severity}">
      <div style="margin-bottom: 10px;">
        <span class="badge" style="background: ${getSeverityColor(issue.severity)};">${issue.severity.toUpperCase()}</span>
        <span class="badge" style="background: #6b7280;">${issue.wcag}</span>
        <span style="color: #6b7280; font-size: 13px;">Principle: ${issue.principle}</span>
      </div>
      <h3 style="margin: 10px 0;">${index + 1}. ${issue.message}</h3>
      <div class="section">
        <div class="section-title">Context:</div>
        <code>${issue.context || 'N/A'}</code>
      </div>
      <div class="section">
        <div class="section-title">Selector:</div>
        <code>${issue.selector}</code>
      </div>
      <div class="section">
        <div class="section-title">Code:</div>
        <code>${issue.code}</code>
      </div>
    </div>
  `).join('')}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
    Report generated by TAMU School of Law HR Tools - Accessibility Checker<br>
    Powered by pa11y - WCAG 2.1 Level AA compliance testing
  </div>
</body>
</html>`;
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
          Accessibility Checker
        </h1>
        <p className="text-lg text-[var(--text-secondary)]">
          Analyze websites for WCAG 2.1 Level AA compliance using real pa11y scanning
        </p>
      </div>

      {/* URL Input Section */}
      <div className="p-6 rounded-lg shadow mb-8" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Website URL Analysis</h2>
        <p className="mb-4 text-[var(--text-secondary)]">
          Enter a website URL to check for accessibility issues
        </p>
        
        <div className="mb-4">
          <label htmlFor="urlInput" className="block mb-2 font-medium text-[var(--text-primary)]">
            Website URL
          </label>
          <input
            id="urlInput"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleScan()}
            placeholder="https://example.com"
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{
              background: 'var(--input-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            disabled={loading}
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        
        <button
          onClick={handleScan}
          disabled={loading}
          className="px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full"
          style={{ background: 'var(--tamu-maroon)' }}
        >
          {loading ? 'Scanning...' : 'Analyze Website'}
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="p-6 rounded-lg shadow mb-8" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--tamu-maroon)' }}></div>
          </div>
          <div className="text-center font-medium text-[var(--text-primary)]">
            Analyzing accessibility...
          </div>
          <div className="text-center text-sm mt-2 text-[var(--text-tertiary)]">
            This may take a few moments
          </div>
          <div className="mt-4 h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--tamu-maroon), #7d2926)'
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && !loading && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg shadow" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <div className="text-sm font-medium mb-1 text-[var(--text-secondary)]">Total Issues</div>
              <div className="text-3xl font-bold text-[var(--text-primary)]">{result.stats.total}</div>
            </div>
            <div className="p-4 rounded-lg shadow" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <div className="text-sm font-medium mb-1 text-[var(--text-secondary)]">Errors</div>
              <div className="text-3xl font-bold text-red-600">{result.stats.errors}</div>
            </div>
            <div className="p-4 rounded-lg shadow" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <div className="text-sm font-medium mb-1 text-[var(--text-secondary)]">Warnings</div>
              <div className="text-3xl font-bold text-orange-600">{result.stats.warnings}</div>
            </div>
            <div className="p-4 rounded-lg shadow" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <div className="text-sm font-medium mb-1 text-[var(--text-secondary)]">Compliance Score</div>
              <div className="text-3xl font-bold text-green-600">
                {calculateComplianceScore(result.stats)}%
              </div>
            </div>
          </div>

          {/* Report Header */}
          <div className="mb-6 p-6 rounded-lg shadow" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Accessibility Report</h2>
              <button
                onClick={downloadReport}
                className="px-4 py-2 rounded-lg border font-medium hover:bg-opacity-90"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                📥 Download Report
              </button>
            </div>
            <div className="text-sm text-[var(--text-tertiary)]">
              <strong>URL:</strong> {result.url}<br />
              <strong>Document:</strong> {result.documentTitle}<br />
              <strong>Standard:</strong> {result.standard}<br />
              <strong>Scanned:</strong> {new Date(result.timestamp).toLocaleString()}<br />
              <strong>Duration:</strong> {result.scanDuration}ms
            </div>
          </div>

          {/* Issues List */}
          {result.issues.length > 0 ? (
            <div className="space-y-4">
              {result.issues.map((issue, index) => (
                <div
                  key={index}
                  className="p-6 rounded-lg shadow transition-all hover:translate-x-1"
                  style={{
                    borderLeft: `4px solid ${getSeverityColor(issue.severity)}`,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ background: getSeverityColor(issue.severity) }}
                        >
                          {issue.severity.toUpperCase()}
                        </span>
                        <span
                          className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                        >
                          {issue.wcag}
                        </span>
                        <span className="text-sm font-medium text-[var(--text-tertiary)]">
                          {issue.principle}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold mb-1 text-[var(--text-primary)]">
                        {index + 1}. {issue.message}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {issue.context && (
                      <div>
                        <div className="text-sm font-semibold mb-1 text-[var(--text-primary)]">
                          📋 Context:
                        </div>
                        <code className="text-sm block p-2 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          {issue.context}
                        </code>
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-semibold mb-1 text-[var(--text-primary)]">
                        📍 Selector:
                      </div>
                      <code className="text-sm block p-2 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {issue.selector}
                      </code>
                    </div>

                    <div>
                      <div className="text-sm font-semibold mb-1 text-[var(--text-primary)]">
                        🔍 Code:
                      </div>
                      <code className="text-sm block p-2 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {issue.code}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-lg shadow" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">
                No Issues Found!
              </h3>
              <p className="text-[var(--text-secondary)]">
                This website meets WCAG 2.1 Level AA standards.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccessibilityChecker;
