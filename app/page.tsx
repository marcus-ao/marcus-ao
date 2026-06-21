import EmailButton from './components/EmailButton';
import SocialIcon from './components/SocialIcon';
import Image from 'next/image';
import { createPageMetadata, siteDescription, siteTitle } from '../lib/site';

export const metadata = createPageMetadata({
  title: siteTitle,
  description: siteDescription,
  type: 'website',
  url: '/',
});

type SocialLink =
  | { name: string; icon: string; email: string; url?: never }
  | { name: string; icon: string; url: string; email?: never };

const profileData = {
  name: "Marcus Ao",
  title: "Undergraduate Student · Technophile",
  bio: "Hi there, I'm Marcus, an undergraduate student majoring in Big Data Management & Application at Guangdong University of Technology. I'm passionate about learning and working at the intersection of Data Science and AI. Through this platform, I share insights, coding tips, and explore the latest trends in technology, reflecting my enthusiasm and thoughts.",
  image: "/marcusao.webp",
  caption: "Sharing love, thoughts, and small joys through life.",
  socialLinks: [
    { name: "Email", icon: "/mail.svg", email: "mmarcusr.ao@gmail.com" },
    { name: "GitHub", icon: "/github.svg", url: "https://github.com/marcus-ao" },
    { name: "Telegram", icon: "/telegram.svg", url: "https://t.me/tel_marcus_ao" }
  ] satisfies SocialLink[]
};

export default function Home() {
  return (
    <>
      <main id="main-content" className="flex w-full flex-1 items-center box-border px-6 py-8 max-[768px]:px-5 max-[768px]:py-6 max-[480px]:px-4" lang="en-US">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-12 max-[900px]:gap-10 max-[768px]:flex-col-reverse max-[768px]:gap-7 max-[768px]:text-center">
          <div className="content min-w-0 flex-1 animate-[fade-up_0.55s_var(--ease-standard)_both] motion-reduce:animate-none">
            <h1 className="font-serif text-[2.75rem] font-semibold leading-[1.08] text-foreground max-[768px]:text-[2.25rem] max-[480px]:text-[2rem]">
              {profileData.name}
            </h1>
            <p className="mt-3 font-sans text-[0.78rem] font-semibold uppercase text-muted-foreground">
              {profileData.title}
            </p>
            <p className="mt-5 max-w-[34rem] font-sans text-[1.05rem] leading-[1.75] text-foreground max-[768px]:mx-auto max-[480px]:text-base">
              {profileData.bio}
            </p>
          </div>
          <div className="image-container relative h-[240px] w-[240px] shrink-0 overflow-hidden rounded-lg border border-border animate-[fade-up_0.55s_var(--ease-standard)_0.08s_both] motion-reduce:animate-none max-[480px]:h-[200px] max-[480px]:w-[200px]">
            <Image
              src={profileData.image}
              alt={profileData.name}
              fill
              sizes="240px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </main>

      <footer className="mt-auto w-full box-border px-6 pb-7 max-[768px]:px-5 max-[480px]:px-4">
        <div className="mb-6 text-center max-[480px]:mb-5">
          <h3 className="mb-4 font-serif text-[1.4rem] font-semibold text-foreground max-[480px]:text-[1.25rem]">Let's Connect :)</h3>
          {profileData.socialLinks.map((link) => (
            'email' in link ? (
              <EmailButton
                key={link.name}
                name={link.name}
                icon={link.icon}
                email={link.email ?? ''}
              />
            ) : (
              <a
                key={link.name}
                href={link.url}
                title={link.name}
                aria-label={`${link.name} (opens in a new tab)`}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link mx-2.5 inline-block no-underline max-[768px]:mx-2 max-[480px]:mx-1.5"
              >
                <SocialIcon src={link.icon} />
              </a>
            )
          ))}
        </div>

        <div className="w-full border-t border-border pt-5 text-center">
          <p className="m-0 p-0 text-[0.9rem] text-muted-foreground max-[480px]:text-[0.8rem]">{profileData.caption}</p>
        </div>
      </footer>
    </>
  );
}
