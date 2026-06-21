import { ImageResponse } from 'next/og';
import { siteDescription, siteName, siteTitle } from '../lib/site';

export const alt = siteTitle;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
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
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ color: '#A78BFA', fontSize: 28, marginBottom: 24 }}>{siteName}</div>
        <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>{siteTitle}</div>
        <div style={{ marginTop: 28, fontSize: 30, color: '#bdbdbd' }}>{siteDescription}</div>
      </div>
    ),
    size,
  );
}
