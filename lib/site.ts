import type { Metadata } from 'next';

export const siteName = 'Marcus Ao';
export const siteTitle = 'Diamonds and Pearls';
export const siteDescription = "Marcus Ao's notes on AI, data science, reading, and life.";
export const siteUrl = 'https://www.marcusao.stream';
export const defaultOgImage = '/opengraph-image';

export const themeColors = {
  light: '#ffffff',
  dark: '#121212',
} as const;

export function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function encodePossiblyEncodedPathSegment(segment: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}

export function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function encodeSitePath(pathname: string): string {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return pathname;
  }

  const suffixIndex = pathname.search(/[?#]/);
  const pathOnly = suffixIndex === -1 ? pathname : pathname.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : pathname.slice(suffixIndex);
  const encodedPath = pathOnly
    .split('/')
    .map((segment, index) => index === 0 || segment === '' ? segment : encodePossiblyEncodedPathSegment(segment))
    .join('/');

  return `${encodedPath || '/'}${suffix}`;
}

export function encodeSlugPath(slug: string): string {
  return slug
    .split('/')
    .filter(Boolean)
    .map(encodePathSegment)
    .join('/');
}

export function createPostHref(section: string, slug: string): string {
  return `/${section}/${encodeSlugPath(slug)}`;
}

export function createPostOgImagePath(section: string, slug: string): string {
  return `/og/${section}/${encodeSlugPath(slug)}`;
}

export function createTagHref(tag: string): string {
  return `/tags/${encodePathSegment(tag)}`;
}

export function createAbsoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, siteUrl).toString();
}

type PageMetadataOptions = {
  description: string;
  images?: string[];
  title: string;
  type?: 'website' | 'article';
  url: string;
};

export function createPageMetadata({
  description,
  images = [defaultOgImage],
  title,
  type,
  url,
}: PageMetadataOptions): Metadata {
  const absoluteUrl = createAbsoluteUrl(url);
  const absoluteImages = images.map(image => createAbsoluteUrl(image));

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl,
    },
    openGraph: {
      title,
      description,
      ...(type ? { type } : {}),
      url: absoluteUrl,
      siteName,
      images: absoluteImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: absoluteImages,
    },
  };
}
