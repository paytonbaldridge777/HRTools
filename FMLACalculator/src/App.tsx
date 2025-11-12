import React, { useEffect } from 'react';
import { HashRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { WorkdaysCalculator } from './components/WorkdaysCalculator';
import HolidayManager from './components/HolidayManager';

function App() {
  // Listen for theme changes from parent window
  useEffect(() => {
    const handleThemeChange = (event: MessageEvent) => {
      if (event.data && event.data.type === 'THEME_CHANGE') {
        const theme = event.data.theme;
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    window.addEventListener('message', handleThemeChange);

    // Request initial theme from parent with slight delay to ensure parent is ready
    if (window.parent !== window) {
      const requestTheme = () => {
        window.parent.postMessage({ type: 'REQUEST_THEME' }, '*');
      };
      
      // Request immediately
      requestTheme();
      
      // Also request after a short delay as a fallback
      const timeoutId = setTimeout(requestTheme, 100);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('message', handleThemeChange);
      };
    }

    return () => window.removeEventListener('message', handleThemeChange);
  }, []);

  return (
    <Router>
      <nav className="p-4 bg-tamu-maroon text-white">
        <Link to="/" className="mr-4">
          Workdays Calculator
        </Link>
        <Link to="/manage-holidays" className="mr-4">
          Manage Holidays
        </Link>
      </nav>
      <Routes>
        <Route path="/" element={<WorkdaysCalculator />} />
        <Route path="/manage-holidays" element={<HolidayManager />} />
      </Routes>
    </Router>
  );
}

export default App;

