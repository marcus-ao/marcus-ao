import { getAdjacentPosts, getAllNoteSlugs, getNoteData, NoteData } from '../../../lib/notes';
import { notFound } from 'next/navigation';
import ArticlePageShell from '../../components/ArticlePageShell';
import { createPageMetadata, createPostHref, createPostOgImagePath } from '../../../lib/site';
import type { Metadata } from 'next';

interface PageParams {
  slug: string[];
}

interface PageProps {
  params: Promise<PageParams>;
}

const unnamedNoteTitle = '未命名分享';
const fallbackNoteDescription = 'Marcus Ao 的一篇分享札记。';
const missingNoteTitle = '未找到这篇分享 - Marcus Ao';

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  const slugsData = getAllNoteSlugs();
  return slugsData.map(item => ({
    slug: item.params.slug.split('/')
  }));
}

export async function generateMetadata({ params: paramsPromise }: PageProps): Promise<Metadata> {
  const resolvedParams = await paramsPromise;
  const slugPath = resolvedParams.slug.join('/');
  const noteData: NoteData | null = await getNoteData(slugPath);

  if (!noteData) {
    return {
      title: missingNoteTitle,
      description: fallbackNoteDescription,
    };
  }

  const title = `${noteData.frontmatter.title || unnamedNoteTitle} - Marcus Ao`;
  const description = noteData.frontmatter.description || fallbackNoteDescription;

  return createPageMetadata({
    title,
    description,
    type: 'article',
    url: createPostHref('share', slugPath),
    images: [createPostOgImagePath('share', slugPath)],
  });
}

export default async function NotePage({ params: paramsPromise }: PageProps) {
  const resolvedParams = await paramsPromise;
  const slugPath = resolvedParams.slug.join('/');
  const noteData: NoteData | null = await getNoteData(slugPath);
  const adjacent = await getAdjacentPosts('share', slugPath);

  if (!noteData) {
    notFound();
  }

  return (
    <ArticlePageShell
      adjacent={adjacent}
      dateLabel="发布于:"
      locale="zh-CN"
      nextLabel="下一篇"
      post={noteData as NoteData}
      previousLabel="上一篇"
      readingTimeLabel={(minutes) => `约 ${minutes} 分钟阅读`}
      section="share"
    />
  );
}
