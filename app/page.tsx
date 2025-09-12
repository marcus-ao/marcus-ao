"use client"
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const profileData = {
  name: "Marcus Ao",
  title: "Undergraduate Student, Technophile",
  bio: "Hi there, I'm Marcus, an undergraduate student majoring in Big Data Management & Application at Guangdong University of Technology. I'm passionate about learning and working at the intersection of Data Science and AI. Through this platform, I share insights, coding tips, and explore the latest trends in technology, reflecting my enthusiasm and thoughts.",
  image: "/marcusao.jpg", 
  caption: "Spread the love, thoughts and joys through the life.",
  socialLinks: [
    { name: "Email", icon: "/mail.svg", email: "mmarcusr.ao@gmail.com" },
    { name: "GitHub", icon: "/github.svg", url: "https://github.com/marcus-ao" },
    { name: "Telegram", icon: "/telegram.svg", url: "https://t.me/tel_marcus_ao" }
  ]
};

export default function Home() {
  const router = useRouter();
  const [showEmailInfo, setShowEmailInfo] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [clipboardAvailable, setClipboardAvailable] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      setClipboardAvailable(true);
    }
  }, []);

  const handleSocialLinkClick = (link: any, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (link.name === "Email") {
      setEmailAddress(link.email);
      setShowEmailInfo(true);
      setCopySuccess(false);
    } else {
      window.open(link.url, '_blank');
    }
  };

  const closeEmailInfo = () => {
    setShowEmailInfo(false);
  };

  const copyToClipboard = () => {
    if (clipboardAvailable) {
      navigator.clipboard.writeText(emailAddress)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch(err => {
          console.error('Unable to copy to the clipboard: ', err);
          fallbackCopyToClipboard();
        });
    } else {
      fallbackCopyToClipboard();
    }
  };

  const fallbackCopyToClipboard = () => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = emailAddress;
      
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        alert("Copy failed, please copy manually.");
      }
    } catch (err) {
      console.error('The fallback copy method also failed: ', err);
      alert("Copy failed, please select and copy the email address manually.");
    }
  };

  return (
    <>
      
      <main>
        <div className="content">
          <h1>{profileData.name}</h1>
          <h2>{profileData.title}</h2>
          <p>{profileData.bio}</p>
        </div>
        <div className="image-container">
          <img 
            src={profileData.image} 
            alt={profileData.name}
            className="profile-image"
          />
        </div>
      </main>
      
      <footer>
        <div className="social-links">
          <h3>Let's Connect :)</h3>
          {profileData.socialLinks.map((link, index) => (
            <a 
              key={index}
              href="#"
              title={link.name}
              onClick={(e) => handleSocialLinkClick(link, e)}
            >
              <img src={link.icon} alt={link.name} />
            </a>
          ))}
        </div>
        
        <div className="caption-container">
          <p className="caption">{profileData.caption}</p>
        </div>
      </footer>

      {showEmailInfo && (
        <div className="email-info-overlay">
          <div className="email-info-box">
          <p style={{ fontWeight: 'bold' }}>My Email Address</p>
            <div className="email-address-container">
              <p className="email-address">{emailAddress}</p>
              <button 
                className="copy-button" 
                onClick={copyToClipboard} 
                title="Copy"
              >
                {copySuccess ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
            <button className="ok-button" onClick={closeEmailInfo}>Fine</button>
          </div>
        </div>
      )}
    </>
  );
}
