"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { useTheme } from '../context/theme-context';

const sharePosts = [
  {
    title: '测试1', 
    image: '/pics/beach.jpg', 
    description: '测试中，敬请期待...', 
    date: '2025-05-05',
    link: '/share/250504/test'
  },
  {
    title: '美国宣布独立',
    image: '/share_notes/250504/Declaration of Independence.jpg',
    description: '本文是对读完美国宣布独立前夕到独立宣言的发表这一历史过程中的梳理。',
    date: '2025-05-04',
    link: '/share/250504/america_independence'
  },

  {
    title: "测试3",
    image: '/pics/',
    description: '测试中，敬请期待...',
    date: '2025-05-01',
    link: ''
  },
];

export default function Share() {
  const router = useRouter(); 
  const { theme } = useTheme();
  const [hoveredPostId, setHoveredPostId] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handlePostClick = (url: string) => {
    window.open(url, '_blank');
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <main className="blog-container">
        <div className="blog-header">
          <h1>Share</h1>
        </div>

        <div className="blog-grid">
          {sharePosts.map((post, index) => (
            <div
              key={index}
              className={`blog-post ${hoveredPostId === index ? 'hovered' : ''}`}
              onClick={() => handlePostClick(post.link)} 
              onMouseEnter={() => setHoveredPostId(index)} 
              onMouseLeave={() => setHoveredPostId(null)}
            >
              <div className="post-image-container">
                <img
                  src={post.image} 
                  alt={post.title} 
                  className="post-image" 
                  onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; 
                    target.src = `https://placehold.co/600x400/eee/ccc?text=Image+Not+Found`;
                  }}
                />
              </div>
              <div className="post-content">
                <h2>{post.title}</h2>
                <p className="post-description">{post.description}</p>
                <span className="post-date">{post.date}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <button
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop} 
        aria-label="Back to the top"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </button>

      <footer className="blog-footer">
        <div className="caption-container">
          <p className="caption">Share moments, share life.</p>
        </div>
      </footer>
    </>
  );
}
