import ListPageShell from '../components/ListPageShell';
import PostGrid from '../components/PostGrid';
import { toPostCardData } from '../components/postCardData';
import { getSortedPostsData } from '../../lib/notes';
import { createPageMetadata } from '../../lib/site';

export const metadata = createPageMetadata({
  title: 'Blog - Marcus Ao',
  description: 'Technical notes and essays by Marcus Ao.',
  url: '/blog',
});

export default async function Blog() {
  const blogPosts = (await getSortedPostsData('blog'))
    .map(post => toPostCardData(post, 'blog'));

  return (
    <ListPageShell title="Blog" footerText="Knowledge shared is knowledge squared." locale="en-US">
      <PostGrid posts={blogPosts} />
    </ListPageShell>
  );
}
