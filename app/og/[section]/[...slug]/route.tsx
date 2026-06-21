import { ImageResponse } from 'next/og';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPostData, type ContentSection } from '../../../../lib/notes';
import { formatPostDate } from '../../../../lib/dates';
import { siteName } from '../../../../lib/site';

export const runtime = 'nodejs';
const imageSize = {
  width: 1200,
  height: 630,
};

type Props = {
  params: Promise<{ section: string; slug: string[] }>;
};

const sectionConfig: Record<ContentSection, { fallbackTitle: string; label: string; locale: string }> = {
  blog: {
    fallbackTitle: 'Untitled Blog Post',
    label: `${siteName} · Blog`,
    locale: 'en-US',
  },
  share: {
    fallbackTitle: '未命名分享',
    label: `${siteName} · 分享`,
    locale: 'zh-CN',
  },
};

let notoSerifScFontPromise: Promise<ArrayBuffer | null> | null = null;

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

function loadNotoSerifScFont(): Promise<ArrayBuffer | null> {
  notoSerifScFontPromise ||= fs
    .readFile(path.join(process.cwd(), 'public', 'fonts', 'noto-serif-sc-subset.woff'))
    .then(toArrayBuffer)
    .catch(() => null);

  return notoSerifScFontPromise;
}

export async function GET(_request: Request, { params }: Props) {
  const resolvedParams = await params;
  if (resolvedParams.section !== 'blog' && resolvedParams.section !== 'share') {
    return new Response('Not found', { status: 404 });
  }

  const section = resolvedParams.section as ContentSection;
  const slugPath = resolvedParams.slug.join('/');
  const post = await getPostData(section, slugPath);

  if (!post || post.frontmatter.external) {
    return new Response('Not found', { status: 404 });
  }

  const config = sectionConfig[section];
  const title = post.frontmatter.title || config.fallbackTitle;
  const date = post.frontmatter.date
    ? formatPostDate(post.frontmatter.date, config.locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const tags = Array.isArray(post.frontmatter.tags) ? post.frontmatter.tags : [];
  const subtitle = [
    date,
    tags.length ? tags.map(tag => `#${tag}`).join('  ') : '',
  ].filter(Boolean).join('  |  ');
  const notoSerifScFont = await loadNotoSerifScFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 72,
          background: '#121212',
          color: '#ececec',
          fontFamily: 'Noto Serif SC Subset, Georgia, serif',
        }}
      >
        <div style={{ color: '#A78BFA', fontSize: 28, marginBottom: 24 }}>{config.label}</div>
        <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.08 }}>{title}</div>
        {subtitle && <div style={{ marginTop: 28, fontSize: 28, color: '#bdbdbd' }}>{subtitle}</div>}
      </div>
    ),
    {
      ...imageSize,
      fonts: notoSerifScFont
        ? [
          {
            name: 'Noto Serif SC Subset',
            data: notoSerifScFont,
            style: 'normal',
          },
        ]
        : undefined,
    },
  );
}
