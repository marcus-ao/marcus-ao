import ListPageShell from '../components/ListPageShell';
import PostGrid from '../components/PostGrid';
import { toPostCardData } from '../components/postCardData';
import { getSortedPostsData } from '../../lib/notes';
import { createPageMetadata } from '../../lib/site';

export const metadata = createPageMetadata({
  title: 'Share - Marcus Ao',
  description: 'Reading notes and thoughts by Marcus Ao.',
  url: '/share',
});

export default async function Share() {
  const sharePosts = (await getSortedPostsData('share'))
    .map(post => toPostCardData(post, 'share'));

  return (
    <ListPageShell title="Share" footerText="Reading widely, thinking deeply." locale="en-US">
      <PostGrid posts={sharePosts} />
    </ListPageShell>
  );
}
