import './globals.css'
import { ThemeProvider } from './context/theme-context'
import type { Metadata } from 'next'
import ThemeToggle from './context/theme-toggle'
import { Analytics } from '@vercel/analytics/react'
const profileData = {
  navItems: ["Home", "Blog"],
};

export const metadata: Metadata = {
  title: "Diamonds and Pearls",
  description: "Personal website of Marcus Ao",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: {
      url: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png'
    },
    other: [
      {
        rel: 'manifest',
        url: '/site.webmanifest',
      },
    ],
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <header>
            <nav>
              {profileData.navItems.map((item, index) => (
                <a 
                  key={index} 
                  href={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                  className="nav-link"
                >
                  {item}
                </a>
              ))}
              <ThemeToggle />
            </nav>
          </header>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
