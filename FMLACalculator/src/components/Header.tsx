import React, { useState } from 'react';
import './Header.css';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="tlw-header">
      <div className="tlw-brandbar"></div>
      <div className="container">
        <div className="tlw-nav">
          <a href="https://paytonbaldridge777.github.io/LawSchoolTools/" className="tlw-brand" aria-label="Return to Tools Portal">
            <span className="tlw-badge">TAMU</span>
            <div className="tlw-brand-text">
              <div className="tlw-kicker">TAMU School of Law</div>
              <div className="tlw-title">Tools Portal</div>
            </div>
          </a>

          <button
            className="tlw-menu-button"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>

          <nav className={`tlw-links ${mobileMenuOpen ? 'show' : ''}`} aria-label="Primary">
            <a className="tlw-link" href="#">Home</a>
          </nav>
        </div>
      </div>
    </header>
  );
};
