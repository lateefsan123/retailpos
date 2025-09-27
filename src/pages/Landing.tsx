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

  const pricingPlans = [
    {
      name: "Starter",
      price: "€9",
      period: "/month",
      description: "Perfect for small businesses starting out",
      features: [
        "Single location",
        "2 users",
        "Basic POS functionality",
        "Email support",
        "Basic reporting"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "€19",
      period: "/month",
      description: "Most popular choice for growing businesses",
      features: [
        "Up to 3 locations",
        "5 users",
        "Advanced analytics",
        "Side businesses support",
        "Weighted products",
        "AI voice announcements",
        "Priority support"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "€49",
      period: "/month",
      description: "Complete solution for large operations",
      features: [
        "Unlimited locations",
        "Unlimited users",
        "API access",
        "Custom branding",
        "Dedicated support",
        "Advanced integrations",
        "Custom training"
      ],
      popular: false
    }
  ]

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navWrapper}>
          <div className={styles.navContent}>
            <div className={styles.navFlex}>
              <div className={styles.logoContainer}>
                <svg 
                  className={styles.logoImage}
                  viewBox="0 0 200 60" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Circle */}
                  <circle cx="25" cy="30" r="14" fill="#7d8d86"/>
                  
                  {/* TillPoint Text */}
                  <text x="45" y="38" fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="22" fontWeight="600" fill="#f1f0e4">TillPoint</text>
                </svg>
              </div>
              <div className={styles.navLinks}>
                <a href="#features" className={`${styles.navLink} ${styles.hasDropdown}`}>Features</a>
                <a href="#pricing" className={styles.navLink}>Pricing</a>
                <a href="#contact" className={styles.navLink}>Contact</a>
                <Link to="/login" className={styles.navLink}>
                  Sign In
                </Link>
                <Link to="/signup" className={styles.navButton}>
                  Sign Up
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
            <span className={styles.heroTitleHighlight}>Gets Your Business</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            Stop wrestling with clunky POS systems. TillPoint is built by retailers, for retailers. 
            Multi-location support, AI voice announcements, weighted products, and side businesses - 
            all the features you actually need, none of the bloat you don't.
          </p>
          
            <div className={styles.heroButtons}>
              <Link to="/login" className={styles.primaryButton}>
                <i className="fas fa-play-circle"></i> Try Demo
              </Link>
              <Link to="/signup" className={styles.secondaryButton}>
                <i className="fas fa-rocket"></i> Start Free Trial
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

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.pricingContent}>
          <div className={styles.pricingHeader}>
            <h2 className={styles.pricingTitle}>
              Simple, Transparent
              <span className={styles.pricingTitleHighlight}> Pricing</span>
            </h2>
            <p className={styles.pricingSubtitle}>
              Choose the plan that fits your business size. All plans include our core POS features 
              with no hidden fees or setup costs.
            </p>
          </div>
          
          <div className={styles.pricingGrid}>
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`${styles.pricingCard} ${plan.popular ? styles.popularCard : ''}`}>
                {plan.popular && (
                  <div className={styles.popularBadge}>
                    <i className="fas fa-star"></i>
                    Most Popular
                  </div>
                )}
                
                <div className={styles.pricingCardHeader}>
                  <h3 className={styles.pricingPlanName}>{plan.name}</h3>
                  <div className={styles.pricingPrice}>
                    <span className={styles.priceAmount}>{plan.price}</span>
                    <span className={styles.pricePeriod}>{plan.period}</span>
                  </div>
                  <p className={styles.planDescription}>{plan.description}</p>
                </div>
                
                <div className={styles.pricingFeatures}>
                  <ul className={styles.featuresList}>
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className={styles.featureItem}>
                        <i className="fas fa-check-circle"></i>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className={styles.pricingAction}>
                  <Link to="/signup" className={styles.pricingButton}>
                    Start Free Trial
                  </Link>
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.pricingFooter}>
            <p className={styles.pricingFooterText}>
              All plans include 30-day free trial • No setup fees • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className={styles.benefitsSection}>
        <div className={styles.benefitsContent}>
          <div className={styles.benefitsGrid}>
            <div>
              <h2 className={styles.benefitsTitle}>
                Built by Retailers, For Retailers
              </h2>
              <div className={styles.benefitItem}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-rocket"></i>
                </div>
                <div className={styles.benefitContent}>
                  <h3>No More POS Headaches</h3>
                  <p>We've been there. Clunky interfaces, missing features, terrible support. TillPoint fixes all of that.</p>
                </div>
              </div>
              <div className={styles.benefitItem}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-phone"></i>
                </div>
                <div className={styles.benefitContent}>
                  <h3>Real Support, Real People</h3>
                  <p>Call us at +353 852287083. We actually answer the phone and know our product inside and out.</p>
                </div>
              </div>
              <div className={styles.benefitItem}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className={styles.benefitContent}>
                  <h3>Your Data, Your Business</h3>
                  <p>Multi-tenant architecture means your data is completely isolated. No sharing, no snooping, no BS.</p>
                </div>
              </div>
            </div>
            <div className={styles.ctaCard}>
              <div className={styles.ctaIcon}>
                <i className="fas fa-play-circle"></i>
              </div>
              <h3 className={styles.ctaTitle}>Try It Before You Buy It</h3>
              <p className={styles.ctaDescription}>
                No credit card required. Jump into our demo and see why retailers are switching to TillPoint.
              </p>
              <Link to="/login" className={styles.ctaButton}>
                <i className="fas fa-play-circle"></i> Try Demo Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaSectionTitle}>
            Stop Fighting Your POS System
          </h2>
          <p className={styles.ctaSectionDescription}>
            Life's too short for bad software. Try TillPoint risk-free and see why retailers are finally happy with their POS.
          </p>
          <div className={styles.ctaSectionButtons}>
            <Link to="/login" className={styles.ctaSectionPrimaryButton}>
              <i className="fas fa-play-circle"></i> Try Demo
            </Link>
            <Link to="/signup" className={styles.ctaSectionSecondaryButton}>
              <i className="fas fa-rocket"></i> Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className={styles.contactSection}>
        <div className={styles.contactContent}>
          <div className={styles.contactHeader}>
            <h2 className={styles.contactTitle}>Questions? We've Got Answers</h2>
            <p className={styles.contactSubtitle}>
              Not sure if TillPoint is right for you? Drop us a line. We're real people who actually care about your business.
            </p>
          </div>
          
          <div className={styles.contactGrid}>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <i className="fas fa-envelope"></i>
                </div>
                <div className={styles.contactDetails}>
                  <h3>Email Us</h3>
                  <p>support@tillpoint.com</p>
                  <p>sales@tillpoint.com</p>
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <i className="fas fa-phone"></i>
                </div>
                <div className={styles.contactDetails}>
                  <h3>Call Us</h3>
                  <p>+353 852287083</p>
                  <p>Mon-Fri 9AM-6PM GMT</p>
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <div className={styles.contactDetails}>
                  <h3>Visit Us</h3>
                  <p>123 Business Street</p>
                  <p>Suite 100, City, State 12345</p>
                </div>
              </div>
            </div>
            
            <div className={styles.contactForm}>
              <form className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="firstName">First Name</label>
                    <input type="text" id="firstName" name="firstName" required />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="lastName">Last Name</label>
                    <input type="text" id="lastName" name="lastName" required />
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" name="email" required />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="phone">Phone Number</label>
                  <input type="tel" id="phone" name="phone" />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="company">Company Name</label>
                  <input type="text" id="company" name="company" />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" rows={5} required></textarea>
                </div>
                
                <button type="submit" className={styles.submitButton}>
                  Send Message
                </button>
              </form>
            </div>
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