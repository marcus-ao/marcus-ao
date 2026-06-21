# Diamonds and Pearls

Personal blog and notes site for Marcus Ao, built with Next.js App Router and deployed on Vercel at https://www.marcusao.stream.

## Stack

- Next.js 15 and React 19
- Tailwind CSS v4 design tokens with light/dark themes
- Markdown content pipeline with GFM, math, syntax highlighting, callouts, wiki links, TOC data, and sanitized HTML
- Local content under `content/blog` and `content/share`
- Static search index generated to `public/search-index.json`
- Optimized WebP assets and self-hosted subset fonts

## Commands

```bash
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd run optimize-images
```

`npm.cmd run build` copies content assets, rebuilds the search index, subsets fonts, and runs the production Next.js build.

## Content

Blog posts live in `content/blog`. Share notes live in `content/share`.

Frontmatter supports:

```yaml
title: Article title
date: 2026-06-20
description: Short summary
tags:
  - Example
external: https://example.com
image: /pics/example.webp
```

Posts with `external` render as outbound cards. Posts without it render as local Markdown article pages.
