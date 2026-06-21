import { getAdjacentPosts, getPostData, getSortedPostsData, NoteData } from '../../../lib/notes';
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

const unnamedPostTitle = 'An Unnamed Post';
const fallbackPostDescription = 'A blog post by Marcus Ao.';
const missingPostTitle = 'Post not found - Marcus Ao';

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  const posts = await getSortedPostsData('blog');

  return posts
    .filter(post => !post.frontmatter.external)
    .map(post => ({
      slug: post.slug.split('/')
    }));
}

export async function generateMetadata({ params: paramsPromise }: PageProps): Promise<Metadata> {
  const resolvedParams = await paramsPromise;
  const slugPath = resolvedParams.slug.join('/');
  const postData: NoteData | null = await getPostData('blog', slugPath);

  if (!postData || postData.frontmatter.external) {
    return {
      title: missingPostTitle,
      description: fallbackPostDescription,
    };
  }

  const title = `${postData.frontmatter.title || unnamedPostTitle} - Marcus Ao`;
  const description = postData.frontmatter.description || fallbackPostDescription;

  return createPageMetadata({
    title,
    description,
    type: 'article',
    url: createPostHref('blog', slugPath),
    images: [createPostOgImagePath('blog', slugPath)],
  });
}

export default async function BlogPostPage({ params: paramsPromise }: PageProps) {
  const resolvedParams = await paramsPromise;
  const slugPath = resolvedParams.slug.join('/');
  const postData: NoteData | null = await getPostData('blog', slugPath);
  const adjacent = await getAdjacentPosts('blog', slugPath);

  if (!postData || postData.frontmatter.external) {
    notFound();
  }

  return (
    <ArticlePageShell
      adjacent={adjacent}
      dateLabel="Published:"
      locale="en-US"
      nextLabel="Next"
      post={postData as NoteData}
      previousLabel="Previous"
      readingTimeLabel={(minutes) => `${minutes} min read`}
      section="blog"
    />
  );
}
