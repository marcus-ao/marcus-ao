import { getAllNoteSlugs, getNoteData, NoteData } from '../../../lib/notes';
import { notFound } from 'next/navigation';
import React from 'react';
import EnhancedMarkdown from '../../components/EnhancedMarkdown';

interface PageParams {
  slug: string[];
}

interface PageProps {
  params: Promise<PageParams>;
}

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  const slugsData = getAllNoteSlugs();
  return slugsData.map(item => ({
    slug: item.params.slug.split('/')
  }));
}

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const resolvedParams = await paramsPromise;
  const slugPath = resolvedParams.slug.join('/'); 
  const noteData: NoteData | null = await getNoteData(slugPath);

  if (!noteData) {
    return {
      title: 'Oops, the note was not found!',
    };
  }

  return {
    title: `${noteData.frontmatter.title || 'An Unnamed Note'} - Marcus Ao`,
    description: noteData.frontmatter.description || 'This is a note that the author forgot to name it, please contact the author to handle...',
  };
}

export default async function NotePage({ params: paramsPromise }: PageProps) {
  const resolvedParams = await paramsPromise;
  const slugPath = resolvedParams.slug.join('/'); 
  const noteData: NoteData | null = await getNoteData(slugPath);

  if (!noteData) {
    notFound();
  }

  const { frontmatter, contentHtml } = noteData as NoteData;

  return (
    <article
      style={{
        maxWidth: 'var(--content-max-width, 1000px)',
        marginLeft: 'auto',
        marginRight: 'auto',
        marginTop: '2rem',
        marginBottom: '2rem',
        padding: '1rem'
      }}
    >
      <header
        style={{
          marginBottom: '2rem'
        }}
      >
        <h1
           style={{
             color: 'var(--foreground)',
           }}
        >
          {frontmatter.title}
        </h1>
        {frontmatter.date && (
          <p
            style={{
              color: 'var(--muted-foreground)',
            }}
          >
            发布于: {new Date(frontmatter.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
        {frontmatter.tags && Array.isArray(frontmatter.tags) && (
          <div style={{ marginTop: '0.75rem' }}>
            {frontmatter.tags.map(tag => (
              <span
                key={tag}
                className="markdown-body-tag"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <EnhancedMarkdown htmlContent={contentHtml} />

    </article>
  );
}
