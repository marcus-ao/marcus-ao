import PostGrid from '../../components/PostGrid';
import ListPageShell from '../../components/ListPageShell';
import { isChinesePostCardLocale, toPostCardData } from '../../components/postCardData';
import { getAllIndexedPosts, getAllTags } from '../../../lib/notes';
import { notFound } from 'next/navigation';
import { createPageMetadata, createTagHref, decodePathSegment } from '../../../lib/site';
import type { Metadata } from 'next';

interface PageParams {
  tag: string;
}

interface PageProps {
  params: Promise<PageParams>;
}

function containsChineseText(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

export async function generateStaticParams(): Promise<{ tag: string }[]> {
  const tags = await getAllTags();

  return tags.map(({ tag }) => ({ tag }));
}

export async function generateMetadata({ params: paramsPromise }: PageProps): Promise<Metadata> {
  const { tag } = await paramsPromise;
  const decodedTag = decodePathSegment(tag);
  const taggedPosts = (await getAllIndexedPosts())
    .filter(post => post.frontmatter.tags?.includes(decodedTag));
  const isChineseTagPage = containsChineseText(decodedTag)
    && taggedPosts.length > 0
    && taggedPosts.every(post => post.section === 'share');
  const title = `#${decodedTag} - Marcus Ao`;
  const description = isChineseTagPage
    ? `#${decodedTag} 标签下的文章。`
    : `Posts tagged ${decodedTag}.`;
  const url = createTagHref(decodedTag);

  return createPageMetadata({
    title,
    description,
    url,
  });
}

export default async function TagPage({ params: paramsPromise }: PageProps) {
  const { tag } = await paramsPromise;
  const decodedTag = decodePathSegment(tag);
  const posts = (await getAllIndexedPosts())
    .filter(post => post.frontmatter.tags?.includes(decodedTag))
    .map(post => toPostCardData(post, post.section));

  if (posts.length === 0) {
    notFound();
  }

  const isChineseTagPage = containsChineseText(decodedTag)
    && posts.every(post => isChinesePostCardLocale(post.locale));
  const backToTopLabel = isChineseTagPage ? '返回顶部' : 'Back to the top';
  const footerText = isChineseTagPage
    ? '同一标签下的片段与笔记。'
    : 'Filtered notes, same thread of curiosity.';
  const pageLocale = isChineseTagPage ? 'zh-CN' : 'en-US';

  return (
    <ListPageShell
      title={`#${decodedTag}`}
      footerText={footerText}
      backToTopLabel={backToTopLabel}
      locale={pageLocale}
    >
      <PostGrid posts={posts} />
    </ListPageShell>
  );
}
