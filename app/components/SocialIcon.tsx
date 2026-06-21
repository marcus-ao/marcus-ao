import type { CSSProperties } from 'react';

type SocialIconProps = {
  src: string;
  className?: string;
};

// Renders a monochrome icon as a CSS mask so it can be recolored (e.g. to the
// accent purple on hover) and adapts to light/dark via `background-color`.
export default function SocialIcon({ src, className }: SocialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`social-icon${className ? ` ${className}` : ''}`}
      style={{ '--social-icon-url': `url("${src}")` } as CSSProperties}
    />
  );
}
