"use client"

import Link from 'next/link';
import ThemeToggle from '../context/theme-toggle';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link href="/">Home</Link>
        <Link href="/blog">Blog</Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
