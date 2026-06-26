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
};

type PostCardProps = {
  post: PostCardData;
};

export default function PostCard({ post }: PostCardProps) {
  const cardClassName = "blog-post group block w-full cursor-pointer border-b border-border pb-[30px] text-inherit no-underline transition-transform duration-300 ease-[var(--ease-standard)] last:border-b-0 animate-[fade-up_0.45s_var(--ease-standard)_both] hover:-translate-y-[5px] focus-visible:-translate-y-[5px] motion-reduce:animate-none motion-reduce:transition-none max-[480px]:pb-[25px]";
  const isChineseLocale = post.locale?.toLowerCase().startsWith('zh');
  const externalLabel = isChineseLocale ? '外部' : 'External';
  const openInNewTabLabel = isChineseLocale ? '在新标签页打开' : 'opens in a new tab';
  const hasMeta = Boolean(post.date || post.external);

  const content = (
    <>
      <div className="post-image-frame relative mb-[15px] h-[300px] w-full overflow-hidden rounded-lg bg-accent max-[768px]:h-[250px] max-[480px]:h-[200px] max-[480px]:rounded-md">
        <Image
          src={post.image}
          alt=""
          fill
          sizes="(max-width: 480px) calc(100vw - 20px), (max-width: 768px) calc(100vw - 30px), 984px"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] group-focus-visible:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <div className="post-content">
        <h2 className="mt-0 mb-2.5 break-words font-serif text-[1.5rem] text-foreground transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary max-[768px]:text-[1.3rem] max-[480px]:text-[1.2rem]">{post.title}</h2>
        {post.description && (
          <p className="mb-2.5 text-muted-foreground leading-[1.6] max-[480px]:text-[0.9rem]">{post.description}</p>
        )}
        {hasMeta && (
          <div className="flex flex-wrap items-center gap-2 text-[0.9rem] text-muted-foreground max-[480px]:text-[0.8rem]">
            {post.date && <span className="leading-none">{post.date}</span>}
            {post.external && (
              <span className="inline-flex items-center rounded border border-primary/30 px-2 py-0.5 text-[0.72rem] font-semibold uppercase leading-none text-primary">
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
