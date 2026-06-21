import { getAllTags } from '../../lib/notes';
import ListPageShell from '../components/ListPageShell';
import Link from 'next/link';
import { createPageMetadata, createTagHref } from '../../lib/site';

export const metadata = createPageMetadata({
  title: 'Tags - Marcus Ao',
  description: 'Browse posts by tag on Marcus Ao\'s blog.',
  url: '/tags',
});

export default async function TagsPage() {
  const tags = await getAllTags();

  return (
    <ListPageShell title="Tags" footerText="Browse by theme, then wander with intent." locale="en-US">
      <div className="tag-cloud">
        {tags.map(({ tag, count }) => (
          <Link
            key={tag}
            href={createTagHref(tag)}
            className="tag-cloud-link"
            aria-label={`${tag}, ${count} ${count === 1 ? 'post' : 'posts'}`}
          >
            <span>{tag}</span>
            <span className="tag-cloud-count">{count}</span>
          </Link>
        ))}
      </div>
    </ListPageShell>
  );
}
