import type { MetadataRoute } from 'next';
import { toPostDate } from '../lib/dates';
import { getAllIndexedPosts, getAllTags } from '../lib/notes';
import { createTagHref, siteUrl } from '../lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllIndexedPosts();
  const tags = await getAllTags();
  const latestPostModified = posts.reduce<Date | null>((latest, post) => {
    const modified = toPostDate(post.frontmatter.date);
    if (!modified) return latest;

    return !latest || modified > latest ? modified : latest;
  }, null) || new Date('2024-01-01T00:00:00.000Z');

  const tagModifiedDates = new Map<string, Date>();
  for (const post of posts) {
    const modified = toPostDate(post.frontmatter.date);
    if (!modified) continue;

    for (const tag of post.frontmatter.tags || []) {
      const current = tagModifiedDates.get(tag);
      if (!current || modified > current) {
        tagModifiedDates.set(tag, modified);
      }
    }
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { route: '', priority: 1 },
    { route: '/blog', priority: 0.8 },
    { route: '/share', priority: 0.8 },
    { route: '/tags', priority: 0.6 },
  ].map(({ route, priority }) => ({
    url: `${siteUrl}${route}`,
    lastModified: latestPostModified,
    changeFrequency: 'weekly',
    priority,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts
    .filter(post => !post.external)
    .map(post => ({
      url: `${siteUrl}${post.href}`,
      lastModified: toPostDate(post.frontmatter.date) || latestPostModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

  const tagRoutes: MetadataRoute.Sitemap = tags.map(({ tag }) => ({
    url: `${siteUrl}${createTagHref(tag)}`,
    lastModified: tagModifiedDates.get(tag) || latestPostModified,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...postRoutes,
    ...tagRoutes,
  ];
}
