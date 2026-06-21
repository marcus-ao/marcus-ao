import Link from 'next/link';
import { formatPostDate } from '../../lib/dates';
import type { AdjacentPost, ContentSection, NoteData } from '../../lib/notes';
import { createPostHref, createTagHref } from '../../lib/site';
import BackToTop from './BackToTop';
import EnhancedMarkdown from './EnhancedMarkdown';
import ReadingProgress from './ReadingProgress';
import TableOfContents from './TableOfContents';

type AdjacentPosts = {
  previous: AdjacentPost;
  next: AdjacentPost;
};

type ArticlePageShellProps = {
  adjacent: AdjacentPosts;
  dateLabel: string;
  locale: string;
  nextLabel: string;
  post: NoteData;
  previousLabel: string;
  readingTimeLabel: (minutes: number) => string;
  section: ContentSection;
};

export default function ArticlePageShell({
  adjacent,
  dateLabel,
  locale,
  nextLabel,
  post,
  previousLabel,
  readingTimeLabel,
  section,
}: ArticlePageShellProps) {
  const { frontmatter, contentHtml, toc, readingTimeMinutes } = post;
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
  const isChineseLocale = locale.toLowerCase().startsWith('zh');
  const tocAriaLabel = isChineseLocale ? '文章目录' : 'Table of contents';
  const tocTitle = isChineseLocale ? '目录' : 'Contents';
  const adjacentAriaLabel = isChineseLocale ? '相邻文章' : 'Adjacent articles';
  const tagsAriaLabel = isChineseLocale ? '文章标签' : 'Post tags';
  const backToTopLabel = isChineseLocale ? '返回顶部' : 'Back to the top';

  return (
    <>
      <ReadingProgress />
      <main id="main-content" className="article-layout" lang={locale}>
        <article className="article-content" lang={locale}>
          <header className="article-header">
            <h1>{frontmatter.title}</h1>
            {(frontmatter.date || readingTimeMinutes > 0) && (
              <p className="article-meta">
                {frontmatter.date && (
                  <span>
                    {dateLabel}{' '}
                    <time dateTime={frontmatter.date}>
                      {formatPostDate(frontmatter.date, locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </span>
                )}
                {frontmatter.date && readingTimeMinutes > 0 && (
                  <span aria-hidden="true">·</span>
                )}
                {readingTimeMinutes > 0 && (
                  <span>{readingTimeLabel(readingTimeMinutes)}</span>
                )}
              </p>
            )}
            {tags.length > 0 && (
              <nav className="article-tags" aria-label={tagsAriaLabel}>
                {tags.map(tag => (
                  <Link
                    key={tag}
                    className="markdown-body-tag"
                    href={createTagHref(tag)}
                  >
                    #{tag}
                  </Link>
                ))}
              </nav>
            )}
          </header>

          <EnhancedMarkdown htmlContent={contentHtml} locale={locale} />

          {(adjacent.previous || adjacent.next) && (
            <nav className="article-adjacent-nav" aria-label={adjacentAriaLabel}>
              {adjacent.previous ? (
                <Link href={createPostHref(section, adjacent.previous.slug)}>
                  <span className="article-adjacent-label">{previousLabel}</span>
                  <span className="article-adjacent-title">{adjacent.previous.frontmatter.title}</span>
                </Link>
              ) : <span className="article-adjacent-spacer" aria-hidden="true" />}
              {adjacent.next ? (
                <Link href={createPostHref(section, adjacent.next.slug)}>
                  <span className="article-adjacent-label">{nextLabel}</span>
                  <span className="article-adjacent-title">{adjacent.next.frontmatter.title}</span>
                </Link>
              ) : <span className="article-adjacent-spacer" aria-hidden="true" />}
            </nav>
          )}
        </article>
        <TableOfContents ariaLabel={tocAriaLabel} items={toc} title={tocTitle} />
      </main>
      <BackToTop label={backToTopLabel} />
    </>
  );
}
