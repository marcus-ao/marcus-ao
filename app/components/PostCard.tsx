import Image from 'next/image';
import Link from 'next/link';
import { BLUR_DATA_URL } from './imagePlaceholder';

export type PostCardData = {
  title: string;
  image: string;
  description: string;
  date: string;
  link: string;
  external?: boolean;
  locale?: string;
  album?: string;
  artist?: string;
  albumDate?: string;
  tags?: string[];
  readingTime?: string;
};

type PostCardProps = {
  post: PostCardData;
};

const calendarIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="shrink-0"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const clockIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="shrink-0"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function PostCard({ post }: PostCardProps) {
  const cardClassName = "blog-post group grid grid-cols-[200px_minmax(0,1fr)] items-start gap-7 w-full cursor-pointer text-inherit no-underline transition-transform duration-300 ease-[var(--ease-standard)] animate-[fade-up_0.45s_var(--ease-standard)_both] hover:-translate-y-[5px] focus-visible:-translate-y-[5px] motion-reduce:animate-none motion-reduce:transition-none max-[768px]:grid-cols-[150px_minmax(0,1fr)] max-[768px]:gap-5 max-[480px]:grid-cols-1 max-[480px]:gap-4";
  const isChineseLocale = post.locale?.toLowerCase().startsWith('zh');
  const externalLabel = isChineseLocale ? '外部' : 'External';
  const openInNewTabLabel = isChineseLocale ? '在新标签页打开' : 'opens in a new tab';
  const tags = (post.tags ?? []).slice(0, 3);
  const hasAlbumMeta = Boolean(post.album || post.artist || post.albumDate);
  const hasInfoRow = Boolean(tags.length || post.date || post.readingTime || post.external);

  const content = (
    <>
      <div className="max-[480px]:mx-auto max-[480px]:w-full max-[480px]:max-w-[220px]">
        <div className="post-image-frame relative aspect-square w-full overflow-hidden rounded-xl bg-accent">
          <Image
            src={post.image}
            alt=""
            fill
            sizes="(max-width: 480px) 220px, (max-width: 768px) 150px, 200px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] group-focus-visible:scale-[1.03] motion-reduce:transition-none"
          />
        </div>
        {hasAlbumMeta && (
          <div className="mt-3 text-center">
            {post.album && (
              <p className="m-0 font-medium leading-tight text-foreground text-[0.95rem]">{post.album}</p>
            )}
            {post.artist && (
              <p className="mt-0.5 mb-0 text-[0.85rem] text-muted-foreground">{post.artist}</p>
            )}
            {post.albumDate && (
              <p className="mt-1.5 mb-0 text-[0.78rem] text-muted-foreground">{post.albumDate}</p>
            )}
          </div>
        )}
      </div>

      <div className="post-content min-w-0">
        <h2 className="mt-0 mb-2.5 break-words font-serif text-[1.5rem] text-foreground transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary max-[768px]:text-[1.3rem] max-[480px]:text-[1.2rem]">{post.title}</h2>
        {post.description && (
          <p className="mb-3 text-muted-foreground leading-[1.6] line-clamp-2 max-[480px]:text-[0.9rem]">{post.description}</p>
        )}
        {hasInfoRow && (
          <div className="flex flex-wrap items-center gap-2 text-[0.9rem] text-muted-foreground max-[480px]:text-[0.8rem]">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.75rem] font-medium leading-none text-primary"
              >
                {tag}
              </span>
            ))}
            {post.date && (
              <span className="inline-flex items-center gap-1 leading-none">
                {calendarIcon}
                {post.date}
              </span>
            )}
            {post.readingTime && (
              <span className="inline-flex items-center gap-1 leading-none">
                {clockIcon}
                {post.readingTime}
              </span>
            )}
            {post.external && (
              <span className="inline-flex items-center rounded-full border border-primary/30 px-2.5 py-0.5 text-[0.72rem] font-semibold uppercase leading-none text-primary">
                {externalLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (post.external) {
    return (
      <a
        className={cardClassName}
        href={post.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${post.title} (${openInNewTabLabel})`}
        lang={post.locale}
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={cardClassName} href={post.link} lang={post.locale}>
      {content}
    </Link>
  );
}
