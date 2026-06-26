import type { ReactNode } from 'react';

// A template re-mounts on every navigation (unlike layout), so the wrapper's
// CSS animation replays on each route change for a subtle page-enter transition.
// Only opacity is animated: a transform here would create a containing block and
// break the fixed-positioned reading progress bar, back-to-top, and overlays.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-transition">{children}</div>;
}
