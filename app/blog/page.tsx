"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../context/theme-context';

const blogPosts = [
  {
    title: 'Episode 1 of NLP Series —— Introduction & Basic Core Concepts',
    image: '/pics/nighthawks.jpg',
    description: '这篇博客是自然语言处理系列的第一期--NLP导论和对一些入门基本术语的介绍。',
    date: '2025-03-04',
    link: 'https://marcusao.notion.site/episode-1-of-nlp-series-introduction-basic-core-concepts?pvs=4'
  },
  {
    title: 'What is Transformer and How it Works?',
    image: '/pics/bedroom.jpg',
    description: '这篇博客对深度学习中的Transformer架构及其工作原理进行了详细介绍。',
    date: '2024-12-07',
    link: 'https://marcusao.notion.site/what-is-transformer-and-how-it-works?pvs=4'
  },
  {
    title: 'Several Common Optimization Learning Methods in Deep Learning',
    image: '/pics/window.jpg',
    description: '这篇博客是对深度学习中常见的一些优化算法进行整理的笔记，其中主要围绕以随机梯度方法为代表的一阶优化算法进行介绍。',
    date: '2024-10-28',
    link: 'https://mmarcusr.notion.site/Several-Common-Optimization-Learning-Methods-in-Deep-Learning-1265a746145f80448c36d3df7227eae7?pvs=4'
  },
  {
    title: 'Implementation of Three Classical Neural Network Projects Based on Keras',
    image: '/pics/excavation.jpg',
    description: '这篇博客是基于Keras对三个经典的神经网络项目进行学习的笔记，分别为IMDB电影二分类问题、Reuters新闻主题多分类问题和Boston房价预测回归问题。',
    date: '2024-09-30',
    link: 'https://marcusao.notion.site/implementation-of-three-classical-neural-network-projects?pvs=4'
  },
  {
    title: "Crawling the Web's Primary Information Based on Scrapy",
    image: '/pics/beach.jpg',
    description: '这篇博客是学习爬虫框架Scrapy时的项目实现笔记，其中主要围绕使用Scrapy框架对Quotes官网以及某工管理学院官网的特定信息进行批量爬取。',
    date: '2024-09-21',
    link: 'https://mmarcusr.notion.site/Crawling-the-Web-s-Primary-Information-Based-on-Scrapy-1075a746145f8008a11fd091bcbe496b?pvs=4'
  },
  {
    title: 'Computational Graphs and Back-propagation Algorithm in Deep Learning',
    image: '/pics/wheat.jpg',
    description: '这篇博客是在学习深度学习时整理的笔记，其中主要介绍了计算图的概念、前向传播与反向传播算法及其实现等内容。',
    date: '2024-09-20',
    link: 'https://mmarcusr.notion.site/Computational-Graphs-and-Back-propagation-Algorithm-in-Deep-Learning-3c8f60707d0147979920eac5c2b7a940?pvs=4'
  },
  {
    title: 'Practical Implementation of Web Crawlers Based on Docker and Pyspider',
    image: '/pics/pyspider.jpg',
    description: '这篇博客是对Python3WebSpider书中的Pyspider项目的复现，展示了基于Docker容器部署Pyspider环境来对"去哪儿旅行"攻略库中的旅游笔记关键信息进行批量爬取。',
    date: '2024-09-11',
    link: 'https://mmarcusr.notion.site/Practical-Implementation-of-Web-Crawlers-Based-on-Docker-and-Pyspider-13b3fbee72ff4c489868049774bfc3e4?pvs=4'
  }
];

export default function Blog() {
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
          <h1>Blog</h1>
        </div>

        <div className="blog-grid">
          {blogPosts.map((post, index) => (
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
        aria-label="回到顶部"
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
          <p className="caption">Knowledge shared is knowledge squared.</p>
        </div>
      </footer>
    </>
  );
}
