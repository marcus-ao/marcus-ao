import { formatPostDate } from '../../lib/dates';
import type { ContentSection, IndexedPost, NoteListItem } from '../../lib/notes';
import { createPostHref, encodeSitePath } from '../../lib/site';
import type { PostCardData } from './PostCard';

const fallbackImages: Record<ContentSection, string> = {
  blog: '/pics/nighthawks.webp',
  share: '/content/share/250504/Declaration%20of%20Independence.webp',
};

const sectionLocales: Record<ContentSection, string> = {
  blog: 'en-US',
  share: 'en-US',
};

type PostCardSource = NoteListItem | IndexedPost;

function hasIndexedPostFields(post: PostCardSource): post is IndexedPost {
  return 'section' in post && 'href' in post && 'external' in post;
}

function getPostImage(image: string | undefined, section: ContentSection): string {
  const normalizedImage = image?.trim();

  if (normalizedImage?.startsWith('/') && !normalizedImage.startsWith('//')) {
    return encodeSitePath(normalizedImage);
  }

  return fallbackImages[section];
}

export function isChinesePostCardLocale(locale?: string): boolean {
  return Boolean(locale?.toLowerCase().startsWith('zh'));
}

export function toPostCardData(post: PostCardSource, fallbackSection: ContentSection): PostCardData {
  const section = hasIndexedPostFields(post) ? post.section : fallbackSection;
  const locale = sectionLocales[section];
  const externalHref = post.frontmatter.external;
  const link = hasIndexedPostFields(post)
    ? post.href
    : externalHref || createPostHref(section, post.slug);

  const readingTimeMinutes = post.readingTimeMinutes;

  return {
    title: post.frontmatter.title || post.slug,
    image: getPostImage(post.frontmatter.image, section),
    description: post.frontmatter.description || '',
    date: formatPostDate(post.frontmatter.date, locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    link,
    external: hasIndexedPostFields(post) ? post.external : Boolean(externalHref),
    locale,
    album: post.frontmatter.album || undefined,
    artist: post.frontmatter.artist || undefined,
    albumDate: post.frontmatter.albumDate || undefined,
    tags: Array.isArray(post.frontmatter.tags) ? post.frontmatter.tags : [],
    readingTime: readingTimeMinutes && readingTimeMinutes > 0 ? `${readingTimeMinutes} min read` : undefined,
  };
}
