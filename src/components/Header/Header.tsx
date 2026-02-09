'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          <span className={styles.logoAccent}>CV</span> Yard Works
        </Link>

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.active : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <Link href="/" className={styles.navLink} onClick={closeMenu}>Home</Link>
          <Link href="/#services" className={styles.navLink} onClick={closeMenu}>Services</Link>
          <Link href="/contact" className={styles.navLink} onClick={closeMenu}>Contact</Link>
          <Link href="/careers" className={styles.navLink} onClick={closeMenu}>Careers</Link>
          <Link href="/estimate" className={`btn btn-primary ${styles.navCta}`} onClick={closeMenu}>
            Free Estimate
          </Link>
        </nav>
      </div>
    </header>
  );
}
