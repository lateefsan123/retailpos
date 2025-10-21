import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './Landing.module.css'

const Landing: React.FC = () => {
  // Carousel features for the showcase section
  const carouselFeatures = [
    {
      title: "Multi-location Management",
      description: "Manage multiple branches and users per business with seamless switching between locations and consolidated reporting.",
      images: ['feature1.1.png', 'feature1.2.png', 'feature1.3.png']
    },
    {
      title: "Dashboard & Analytics",
      description: "Stay organized with intelligent reminders and get real-time insights from your comprehensive business dashboard.",
      images: ['feature2.1.png', 'feature2.2.png', 'feature2.3.png']
    },
    {
      title: "Advanced Features",
      description: "Track and transfer inventory between users and locations with real-time updates and automated stock management.",
      images: ['feature3.1.png', 'feature3.2.png', 'features3.3.png', 'features3.4.png']
    }
  ]

  // Original 6 features for "The Features That Actually Matter" section
  const features = [
    {
      icon: "fas fa-microphone-alt",
      title: "AI Voice Announcements",
      description: "ChatGPT-powered voice that announces orders in real-time. Perfect for busy kitchens, drive-thrus, and accessibility. No more shouting across the room."
    },
    {
      icon: "fas fa-store",
      title: "Side Businesses Made Simple",
      description: "Run multiple businesses from one system. Coffee shop + bakery? Restaurant + catering? We've got you covered with separate tracking and reporting."
    },
    {
      icon: "fas fa-weight-hanging",
      title: "Weighted Products Done Right",
      description: "Finally, a POS that handles produce, meat, and bulk items properly. Weigh, price, and track everything from apples to deli meats with precision."
    },
    {
      icon: "fas fa-layer-group",
      title: "Multi-Location Magic",
      description: "Manage multiple locations from one dashboard. Switch between stores instantly, see consolidated reports, and keep everything organized without the headache."
    },
    {
      icon: "fas fa-credit-card",
      title: "Partial Payments That Work",
      description: "Layaway, split payments, store credit - handle any payment scenario your customers throw at you. No more awkward 'I'll pay the rest later' situations."
    },
    {
      icon: "fas fa-chart-line",
      title: "Analytics That Actually Help",
      description: "See what's selling, what's not, and what's making you money. Real insights, not just pretty charts that don't tell you anything useful."
    }
  ]


  // FeatureBlock Component
  const FeatureBlock = ({ feature, delay = 0, isReversed = false }: { feature: (typeof carouselFeatures)[0]; delay?: number; isReversed?: boolean }) => {
    const [activeImage, setActiveImage] = useState(0)
    const [modalImg, setModalImg] = useState<string | null>(null)
    const [intervalRef, setIntervalRef] = useState<NodeJS.Timeout | null>(null)

    const startTimer = () => {
      if (intervalRef) {
        clearInterval(intervalRef)
      }
      const timing = 4000 + delay
      const interval = setInterval(() => {
        setActiveImage((prev) => (prev + 1 < feature.images.length ? prev + 1 : 0))
      }, timing)
      setIntervalRef(interval)
    }

    useEffect(() => {
      startTimer()
      return () => {
        if (intervalRef) {
          clearInterval(intervalRef)
        }
      }
    }, [feature, delay])

    const handleArrowClick = (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        setActiveImage((prev) => (prev > 0 ? prev - 1 : feature.images.length - 1))
      } else {
        setActiveImage((prev) => (prev + 1 < feature.images.length ? prev + 1 : 0))
      }
      // Reset timer when arrow is clicked
      startTimer()
    }

    return (
      <div className={`${styles.featureBlock} ${isReversed ? styles.featureBlockReversed : ''}`}>
        <div className={styles.featureContent}>
          <h3 className={styles.featureBlockTitle}>{feature.title}</h3>
          <p className={styles.featureBlockDescription}>{feature.description}</p>
        </div>

        <div className={styles.carouselWrapper}>
          <div className={styles.carouselContainer}>
            {feature.images.map((img, i) => (
              <img
                key={i}
                src={`/images/backgrounds/features/${img}`}
                onClick={() => setModalImg(`/images/backgrounds/features/${img}`)}
                className={`${styles.carouselImage} ${
                  i === activeImage ? styles.activeImage : styles.inactiveImage
                } ${i > activeImage ? styles.rightOffset : styles.leftOffset}`}
                onError={(e) => {
                  console.error('Failed to load image:', img)
                  e.currentTarget.src = '/images/backgrounds/landingpageleftimage.png'
                }}
              />
            ))}

            {/* Nav arrows */}
            <button
              onClick={() => handleArrowClick('prev')}
              className={styles.carouselNavButton}
              style={{ left: '-70px' }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => handleArrowClick('next')}
              className={styles.carouselNavButton}
              style={{ right: '-70px' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Dot indicators */}
          <div className={styles.dotIndicators}>
            {feature.images.map((_, index) => (
              <button
                key={index}
                className={`${styles.dot} ${index === activeImage ? styles.activeDot : ''}`}
                onClick={() => {
                  setActiveImage(index)
                  startTimer() // Reset timer when dot is clicked
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Modal popup */}
        {modalImg && (
          <div
            className={styles.modalOverlay}
            onClick={() => setModalImg(null)}
          >
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <img src={modalImg} className={styles.modalImage} alt={feature.title} />
              <button
                className={styles.modalClose}
                onClick={() => setModalImg(null)}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Fix scrolling for landing page
  useEffect(() => {
    // Enable scrolling for landing page
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.style.overflow = 'auto'
      rootElement.style.height = 'auto'
    }

    // Cleanup function to restore original styles when component unmounts
    return () => {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      if (rootElement) {
        rootElement.style.overflow = 'hidden'
        rootElement.style.height = '100%'
      }
    }
  }, [])




  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navWrapper}>
          <div className={styles.navContent}>
            <div className={styles.navFlex}>
              <div className={styles.logoContainer}>
                <h1 className={styles.logoText}>TillPoint</h1>
              </div>
              <div className={styles.navLinks}>
                <a 
                  href="/documentation/TillPoint POS – Onboarding Guide (Workflows Addendum).pdf" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.navButton}
                  style={{ backgroundColor: 'transparent', border: '2px solid #111827', color: '#111827' }}
                >
                  Documentation
                </a>
                <Link to="/login" className={styles.navButton}>
                  Sign In
                </Link>
                <Link to="/signup" className={styles.navButton}>
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            The POS That Actually
            <span className={styles.heroTitleBlack}>Gets Your Business</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            Built by retailers, for retailers. All the features you actually need, none of the bloat you don't.
          </p>
          
            <div className={styles.heroButtons}>
              <Link to="/login" className={styles.primaryButton}>
                Get Started
              </Link>
            </div>
          
          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>3</span>
              <span className={styles.statLabel}>Plans</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>€9</span>
              <span className={styles.statLabel}>Starting</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>24/7</span>
              <span className={styles.statLabel}>Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Cards Section */}
      <section className={styles.featuresCardsSection}>
        <div className={styles.featuresCardsContent}>
          <div className={styles.featuresCardsGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>
                <i className="fas fa-store"></i>
              </div>
              <h3 className={styles.featureCardTitle}>Multi-location management</h3>
              <p className={styles.featureCardDescription}>
                Consolidate your entire business with one system for managing multiple stores, locations, and side businesses.
              </p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>
                <i className="fas fa-microphone-alt"></i>
              </div>
              <h3 className={styles.featureCardTitle}>AI-powered operations</h3>
              <p className={styles.featureCardDescription}>
                Build seamless experiences with AI voice announcements, smart inventory tracking, and automated workflows.
              </p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>
                <i className="fas fa-chart-line"></i>
              </div>
              <h3 className={styles.featureCardTitle}>Retail-focused innovation</h3>
              <p className={styles.featureCardDescription}>
                Built by retailers, for retailers. Weighted products, partial payments, and features that actually work for your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section className={styles.productShowcaseSection}>
        <div className={styles.productShowcaseContent}>
          <div className={styles.productShowcaseGrid}>
            {/* Left Side - Retail Store Checkout Scene */}
            <div className={styles.productShowcaseLeft}>
              <div className={styles.productShowcaseImage}>
                <img 
                  src="images/backgrounds/landingpageleftimage.png" 
                  alt="TillPoint POS in action at retail checkout" 
                  className={styles.showcaseImage}
                />
              </div>
            </div>
            
            {/* Right Side - Payment Methods and Terminal Image */}
            <div className={styles.productShowcaseRight}>
              <div className={styles.productShowcaseImage}>
                <img 
                  src="/images/backgrounds/landingpagerightimage.png" 
                  alt="TillPoint Payment Methods and Terminal" 
                  className={`${styles.showcaseImage} ${styles.showcaseImageRight}`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.featuresContent}>
          <div className={styles.featuresHeader}>
            <h2 className={styles.featuresTitle}>
              The Features That Actually Matter
            </h2>
            <p className={styles.featuresSubtitle}>
              We built TillPoint because we were tired of POS systems that promise everything but deliver nothing. 
              Here's what makes us different.
            </p>
          </div>
          
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <i className={feature.icon}></i>
                </div>
                <h3 className={styles.featureTitle}>
                  {feature.title}
                </h3>
                <p className={styles.featureDescription}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <section className={styles.featureShowcaseSection}>
        <div className={styles.featureShowcaseContent}>
          <div className={styles.featureShowcaseHeader}>
            <h2 className={styles.featureShowcaseTitle}>
              See TillPoint in Action
            </h2>
          </div>
          
          <div className={styles.featureShowcaseGrid}>
            {carouselFeatures.map((feature, idx) => (
              <div key={idx}>
                <FeatureBlock 
                  feature={feature} 
                  delay={idx * 1500}
                  isReversed={idx % 2 === 1} // Alternate layout: odd index = reversed (text left, image right)
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <h3 className={styles.footerBrandTitle}>TillPoint</h3>
            </div>
            <div className={styles.footerSection}>
              <h4>Product</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#features" className={styles.footerLink}>Features</a></li>
              </ul>
            </div>
            <div className={styles.footerSection}>
              <h4>Support</h4>
              <ul className={styles.footerLinks}>
                <li><a href="/documentation/TillPoint POS – Onboarding Guide (Workflows Addendum).pdf" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>Documentation</a></li>
              </ul>
            </div>
          </div>
          <div className={styles.footerDivider}>
            <p>&copy; 2025 TillPoint. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default Landing