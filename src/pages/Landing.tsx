import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

const Landing: React.FC = () => {
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

  const features = [
    {
      icon: "fas fa-barcode",
      title: "Barcode Scanning",
      description: "Fast and accurate product scanning with built-in barcode reader support for instant product lookup and checkout."
    },
    {
      icon: "fas fa-building",
      title: "Multi-Tenant Architecture",
      description: "Manage multiple businesses from one system with complete data isolation and role-based access controls."
    },
    {
      icon: "fas fa-credit-card",
      title: "Partial Payments",
      description: "Accept split payments, layaway plans, and partial transactions with flexible payment processing options."
    },
    {
      icon: "fas fa-weight",
      title: "Weighted Products",
      description: "Handle bulk items, produce, and weighted goods with precise weight-based pricing and inventory tracking."
    },
    {
      icon: "fas fa-volume-up",
      title: "Text-to-Speech",
      description: "AI-powered voice announcements with OpenAI TTS integration for order confirmation and accessibility."
    },
    {
      icon: "fas fa-chart-bar",
      title: "Advanced Analytics",
      description: "Comprehensive dashboard with sales insights, inventory tracking, and business performance metrics."
    }
  ]

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.navFlex}>
            <div className={styles.logoContainer}>
              <h1 className={styles.logoText}>
                TillPoint
              </h1>
            </div>
            <div className={styles.navLinks}>
              <a href="#features" className={styles.navLink}>Features</a>
              <a href="#pricing" className={styles.navLink}>Pricing</a>
              <a href="#contact" className={styles.navLink}>Contact</a>
              <Link to="/login" className={styles.navLink}>
                Sign In
              </Link>
              <Link to="/login" className={styles.navButton}>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Modern Point of Sale
            <span className={styles.heroTitleHighlight}>Built for Today's Business</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            TillPoint combines powerful features with intuitive design to streamline your retail operations. 
            From barcode scanning to advanced analytics, everything you need in one system.
          </p>
          
          <div className={styles.heroButtons}>
            <Link to="/login" className={styles.primaryButton}>
              Sign In
            </Link>
            <button className={styles.secondaryButton}>
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.featuresContent}>
          <div className={styles.featuresHeader}>
            <h2 className={styles.featuresTitle}>
              Everything You Need to Run Your Business
            </h2>
            <p className={styles.featuresSubtitle}>
              Powerful features designed to make your retail operations smooth, efficient, and profitable.
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

      {/* Benefits Section */}
      <section className={styles.benefitsSection}>
        <div className={styles.benefitsContent}>
          <div className={styles.benefitsGrid}>
            <div>
              <h2 className={styles.benefitsTitle}>
                Why Choose TillPoint?
              </h2>
              <div className={styles.benefitItem}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-check"></i>
                </div>
                <div className={styles.benefitContent}>
                  <h3>Easy Setup</h3>
                  <p>Get up and running in minutes with our intuitive setup process.</p>
                </div>
              </div>
              <div className={styles.benefitItem}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-check"></i>
                </div>
                <div className={styles.benefitContent}>
                  <h3>24/7 Support</h3>
                  <p>Our dedicated support team is always here to help you succeed.</p>
                </div>
              </div>
              <div className={styles.benefitItem}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-check"></i>
                </div>
                <div className={styles.benefitContent}>
                  <h3>Secure & Reliable</h3>
                  <p>Enterprise-grade security with 99.9% uptime guarantee.</p>
                </div>
              </div>
            </div>
            <div className={styles.ctaCard}>
              <div className={styles.ctaIcon}>
                <i className="fas fa-cash-register"></i>
              </div>
              <h3 className={styles.ctaTitle}>Ready to Get Started?</h3>
              <p className={styles.ctaDescription}>
                Join thousands of businesses already using TillPoint to streamline their operations.
              </p>
              <Link to="/login" className={styles.ctaButton}>
                Start Your Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaSectionTitle}>
            Transform Your Business Today
          </h2>
          <p className={styles.ctaSectionDescription}>
            Experience the power of modern point-of-sale technology. No setup fees, no long-term contracts.
          </p>
          <div className={styles.ctaSectionButtons}>
            <Link to="/login" className={styles.ctaSectionPrimaryButton}>
              Sign In
            </Link>
            <button className={styles.ctaSectionSecondaryButton}>
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <h3 className={styles.footerBrandTitle}>TillPoint</h3>
              <p className={styles.footerBrandDescription}>
                The modern point-of-sale system designed for today's businesses. 
                Powerful, intuitive, and built to grow with you.
              </p>
            </div>
            <div className={styles.footerSection}>
              <h4>Product</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#" className={styles.footerLink}>Features</a></li>
                <li><a href="#" className={styles.footerLink}>Pricing</a></li>
                <li><a href="#" className={styles.footerLink}>Integrations</a></li>
              </ul>
            </div>
            <div className={styles.footerSection}>
              <h4>Support</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#" className={styles.footerLink}>Help Center</a></li>
                <li><a href="#" className={styles.footerLink}>Contact Us</a></li>
                <li><a href="#" className={styles.footerLink}>Documentation</a></li>
              </ul>
            </div>
          </div>
          <div className={styles.footerDivider}>
            <p>&copy; 2024 TillPoint. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing