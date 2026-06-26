import type { ReactNode } from 'react';
import BackToTop from './BackToTop';

type ListPageShellProps = {
  backToTopLabel?: string;
  children: ReactNode;
  footerText: string;
  locale?: string;
  title: string;
};

export default function ListPageShell({
  backToTopLabel = 'Back to the top',
  children,
  footerText,
  locale,
  title,
}: ListPageShellProps) {
  return (
    <>
      <main
        id="main-content"
        className="mx-auto mt-2 w-full max-w-5xl flex-1 box-border px-5 max-[768px]:mt-6 max-[768px]:px-[15px] max-[480px]:mt-5 max-[480px]:px-2.5"
        lang={locale}
      >
        <div className="mb-[30px] w-full text-left">
          <h1 className="mb-2.5 font-serif text-[clamp(2rem,1.3rem_+_2.6vw,2.5rem)] tracking-[-0.02em] text-foreground">
            {title}
          </h1>
        </div>

        {children}
      </main>

      <BackToTop label={backToTopLabel} />

      <footer className="mx-auto mt-[50px] w-full max-w-5xl box-border px-5 pt-5 pb-5 text-center max-[768px]:px-[15px] max-[480px]:px-2.5">
        <div className="mt-5 w-full border-t border-border pt-5 text-center">
          <p className="m-0 p-0 text-[0.9rem] text-muted-foreground max-[480px]:text-[0.8rem]">
            {footerText}
          </p>
        </div>
      </footer>
    </>
  );
}
