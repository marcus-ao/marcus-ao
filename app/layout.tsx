import './globals.css'
import './markdown-styles.css'
import 'katex/dist/katex.min.css'
import { ThemeProvider } from './context/theme-context'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Public_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import SiteNavigation from './components/SiteNavigation'
import SkipLink from './components/SkipLink'
import { siteDescription, siteName, siteTitle, siteUrl, themeColors } from '../lib/site'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-heading-latin',
  display: 'swap',
})

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-body-latin',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: '/',
  },
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: '/',
    siteName,
    images: ['/opengraph-image'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/opengraph-image'],
  },
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

export const viewport: Viewport = {
  themeColor: themeColors.light,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const isTheme = (value) => value === 'light' || value === 'dark';
                let theme = null;
                try {
                  const storedTheme = localStorage.getItem('theme');
                  if (isTheme(storedTheme)) {
                    theme = storedTheme;
                  } else if (storedTheme) {
                    localStorage.removeItem('theme');
                  }
                } catch {}
                if (!theme) {
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  theme = prefersDark ? 'dark' : 'light';
                }
                document.documentElement.setAttribute('data-theme', theme);
                document.documentElement.style.colorScheme = theme;
                let themeColorMeta = document.querySelector('meta[name="theme-color"]');
                if (!themeColorMeta) {
                  themeColorMeta = document.createElement('meta');
                  themeColorMeta.setAttribute('name', 'theme-color');
                  document.head.appendChild(themeColorMeta);
                }
                themeColorMeta.setAttribute('content', theme === 'dark' ? '${themeColors.dark}' : '${themeColors.light}');
              })();
            `,
          }}
        />
        <ThemeProvider>
          <SkipLink />
          <header className="site-header">
            <SiteNavigation />
          </header>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
