import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SidebarStepper from "./Sidebarstepper";
import { useAuth } from "../contexts/AuthContext";
import { ALL_USER_ICONS, DEFAULT_ICON_NAME } from "../constants/userIcons";

const steps = [
  {
    label: "Account Setup",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a9.75 9.75 0 1115 0v.75H4.5v-.75z" />
      </svg>
    ),
  },
  {
    label: "Business Info",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V3h18v18H3zm3-9h12" />
      </svg>
    ),
  },
  {
    label: "Contact Details",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75L12 12l9.75-5.25M2.25 17.25l9.75 5.25 9.75-5.25M2.25 6.75v10.5m19.5-10.5v10.5" />
      </svg>
    ),
  },
  {
    label: "Finish",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  },
];

const Signup: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    // Step 1: Account Setup
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    ownerUsername: "",
    ownerIcon: DEFAULT_ICON_NAME,
    // Step 2: Business Info
    businessName: "",
    businessType: "",
    businessDescription: "",
    businessAddress: "",
    businessPhone: "",
    currency: "USD",
    // Step 3: Contact Details
    website: "",
    vatNumber: "",
    openTime: "09:00",
    closeTime: "18:00",
  });
  const progress = Math.round((currentStep / steps.length) * 100);
  const selectedOwnerIcon = ALL_USER_ICONS.find(icon => icon.name === formData.ownerIcon) || ALL_USER_ICONS[0];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIconSelect = (iconName: string) => {
    setFormData(prev => ({
      ...prev,
      ownerIcon: iconName
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        throw new Error("Please fill in all required account fields");
      }

      if (!formData.businessName || !formData.businessType || !formData.businessAddress) {
        throw new Error("Please fill in all required business fields");
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const trimmedUsername = formData.ownerUsername.trim();
      if (!trimmedUsername) {
        throw new Error("Please choose an owner username");
      }
      if (trimmedUsername.includes(" ")) {
        throw new Error("Owner username cannot contain spaces");
      }
      if (!formData.ownerIcon) {
        throw new Error("Please select an owner icon");
      }

      const normalizedUsername = trimmedUsername.toLowerCase();

      // Call the register function with all the form data
      const result = await register(
        normalizedUsername,
        formData.password,
        formData.businessName,
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.phone,
        formData.businessType,
        formData.businessDescription,
        formData.businessAddress,
        formData.businessPhone,
        formData.currency,
        formData.website,
        formData.vatNumber,
        formData.openTime,
        formData.closeTime,
        formData.ownerIcon
      );

      if (result.success) {
        if (result.pendingApproval) {
          // Show pending approval message
          setError(null);
          const pendingMessage = `Registration submitted successfully!\n\nYour account is now pending admin approval. You will be able to log in once an administrator approves your registration.\n\nPlease check back later or contact support if you have any questions.`;
          setError(pendingMessage);
          // Don't redirect - let user see the message
        } else {
          // Redirect to login immediately if no admin credentials
          navigate('/login', { 
            state: { 
              message: 'Account created successfully! Please sign in.',
              email: formData.email 
            } 
          });
        }
      } else {
        throw new Error("Failed to create account. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during signup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonStyle = {
    padding: "0.65rem 1.5rem",
    borderRadius: "9999px",
    backgroundColor: "#7d8d86",
    border: "none",
    color: "#f1f0e4",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  };

  const secondaryButtonStyle = {
    padding: "0.65rem 1.5rem",
    borderRadius: "9999px",
    backgroundColor: "#e5e7eb",
    border: "none",
    color: "#3e3f29",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundImage: "url('images/signupbg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      position: "relative"
    }}>
      {/* Background Overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        zIndex: 1
      }}></div>
      {/* Header */}
      <header
        style={{
        backgroundColor: "white",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        borderBottom: "1px solid #e5e7eb",
        position: "relative",
        zIndex: 10,
      }}
      >
        <div
          style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "0 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
            height: "4rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <svg 
                style={{ height: "60px", width: "200px" }}
                viewBox="0 0 200 60" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="25" cy="30" r="14" fill="#7d8d86"/>
                <text x="45" y="38" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="600" fill="#3e3f29">TillPoint</text>
              </svg>
            </div>
          </div>
          <div>
            <Link
              to="/"
              style={{
                color: "#374151",
              fontWeight: "600",
              fontSize: "1.125rem",
              textDecoration: "none",
              transition: "color 0.2s"
              }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <div
        style={{
          padding: "3rem 2rem",
          textAlign: "center",
        position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "80rem",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: "700",
              marginBottom: "1rem",
              color: "white",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          >
            Welcome to <span style={{ color: "#7d8d86" }}>TillPoint</span>
          </h1>
          <p
            style={{
              fontSize: "1.75rem",
              color: "white",
              opacity: "0.9",
              maxWidth: "600px",
              margin: "0 auto",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          >
            Complete the 4 steps to get started
          </p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "2rem", minHeight: "calc(100vh - 12rem)", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", gap: "1.5rem", maxWidth: "1200px", width: "100%" }}>
          {/* Sidebar */}
          <aside
            style={{
              width: "280px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              padding: "2rem 1.5rem",
              height: "600px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SidebarStepper
              steps={steps}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
          </aside>

          {/* Main */}
          <main
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "800px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box"
              }}
            >
          <h1 style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>
            {steps[currentStep - 1].label}
          </h1>
          <p style={{ textAlign: "center", color: "#374151", marginBottom: "1.5rem" }}>
            Step {currentStep} of {steps.length}
          </p>

          {/* Progress Bar */}
          <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "9999px", marginBottom: "2rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "#7d8d86" }} />
          </div>

          {/* Error/Success Display */}
          {error && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "1rem",
              borderRadius: "12px",
              marginBottom: "1.5rem",
              fontSize: "0.9rem",
              whiteSpace: "pre-line",
              textAlign: "left"
            }}>
              {error}
            </div>
          )}

          {/* Form Content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <form onSubmit={handleSubmit} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "grid", gap: "1.5rem", flex: 1 }}>
          {currentStep === 1 && (
            <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <input 
                        name="firstName"
                        placeholder="First Name *" 
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        autoComplete="off"
                        style={{ 
                          width: "100%",
                          padding: "1rem", 
                          borderRadius: "12px", 
                          border: "2px solid #9ca3af",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box"
                        }} 
                      />
                      <input 
                        name="lastName"
                        placeholder="Last Name *" 
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        autoComplete="off"
                        style={{ 
                          width: "100%",
                          padding: "1rem", 
                          borderRadius: "12px", 
                          border: "2px solid #9ca3af",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box"
                        }} 
                      />
                    </div>
                    <input 
                      name="email"
                      type="email"
                      placeholder="Email *" 
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      autoComplete="off"
                      style={{ 
                        width: "100%",
                        padding: "1rem", 
                        borderRadius: "12px", 
                        border: "2px solid #9ca3af",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box"
                      }} 
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <input 
                        name="ownerUsername"
                        placeholder="Owner Username *"
                        value={formData.ownerUsername}
                        onChange={(event) => {
                          const value = event.target.value.toLowerCase();
                          setFormData(prev => ({
                            ...prev,
                            ownerUsername: value
                          }));
                        }}
                        required
                        autoComplete="off"
                        style={{ 
                          width: "100%",
                          padding: "1rem", 
                          borderRadius: "12px", 
                          border: "2px solid #9ca3af",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box"
                        }} 
                      />
                      <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                        This username is used for the owner's login.
                      </span>
                    </div>
                    <input 
                      name="phone"
                      type="tel"
                      placeholder="Phone (optional)" 
                      value={formData.phone}
                      onChange={handleInputChange}
                      autoComplete="off"
                      style={{ 
                        width: "100%",
                        padding: "1rem", 
                        borderRadius: "12px", 
                        border: "2px solid #9ca3af",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box"
                      }} 
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <input 
                        name="password"
                        type="password"
                        placeholder="Password *" 
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        autoComplete="new-password"
                        style={{ 
                          width: "100%",
                          padding: "1rem", 
                          borderRadius: "12px", 
                          border: "2px solid #9ca3af",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box"
                        }} 
                      />
                      <input 
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm Password *" 
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        autoComplete="new-password"
                        style={{ 
                          width: "100%",
                          padding: "1rem", 
                          borderRadius: "12px", 
                          border: "2px solid #9ca3af",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box"
                        }} 
                      />
                    </div>
                    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <p style={{ margin: 0, fontWeight: 600, color: "#1f2937" }}>Choose Owner Icon</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: "0.75rem" }}>
                        {ALL_USER_ICONS.map((icon) => {
                          const isSelected = icon.name === formData.ownerIcon;
                          return (
                            <button
                              key={icon.name}
                              type="button"
                              onClick={() => handleIconSelect(icon.name)}
                              style={{
                                borderRadius: "12px",
                                border: isSelected ? "2px solid #7d8d86" : "1px solid #d1d5db",
                                backgroundColor: isSelected ? "#eef4f2" : "#ffffff",
                                padding: "10px 8px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                boxShadow: isSelected ? "0 8px 20px rgba(125, 141, 134, 0.25)" : "0 2px 6px rgba(15, 23, 42, 0.05)",
                                transition: "all 0.2s ease",
                                color: "#1f2937"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = isSelected ? "0 10px 24px rgba(125, 141, 134, 0.3)" : "0 4px 12px rgba(15, 23, 42, 0.08)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = isSelected ? "0 8px 20px rgba(125, 141, 134, 0.25)" : "0 2px 6px rgba(15, 23, 42, 0.05)";
                              }}
                            >
                              <div style={{
                                width: "52px",
                                height: "52px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                backgroundColor: "#f3f4f6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}>
                                <img
                                  src={`/images/icons/${icon.name}.png`}
                                  alt={icon.label}
                                  style={{ width: "52px", height: "52px", objectFit: "cover" }}
                                />
                              </div>
                              <span style={{ fontSize: "0.75rem", fontWeight: isSelected ? 600 : 500, textAlign: "center" }}>
                                {icon.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
            </>
          )}

          {currentStep === 2 && (
            <>
                    <input 
                      name="businessName"
                      placeholder="Business Name *" 
                      value={formData.businessName}
                      onChange={handleInputChange}
                      required
                      autoComplete="off"
                      style={{ 
                        width: "100%",
                        padding: "1rem", 
                        borderRadius: "12px", 
                        border: "2px solid #9ca3af",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box"
                      }} 
                    />
                    <select 
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      required
                      autoComplete="off"
                      style={{ 
                        width: "100%",
                        padding: "1rem", 
                        borderRadius: "12px", 
                        border: "2px solid #9ca3af",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s",
                        backgroundColor: "white",
                        boxSizing: "border-box"
                      }}
                    >
                      <option value="">Select Business Type *</option>
                      <option value="Retail">Retail</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Beauty">Beauty & Wellness</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Professional Services">Professional Services</option>
                      <option value="Other">Other</option>
                    </select>
                    <textarea 
                      name="businessDescription"
                      placeholder="Business Description (optional)" 
                      value={formData.businessDescription}
                      onChange={handleInputChange}
                      rows={3}
                      autoComplete="off"
                        style={{ 
                          width: "100%",
                          padding: "1rem", 
                          borderRadius: "12px", 
                          border: "2px solid #9ca3af",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                          resize: "vertical",
                          boxSizing: "border-box"
                        }}
                    />
                    <input 
                      name="businessAddress"
                      placeholder="Business Address *" 
                      value={formData.businessAddress}
                      onChange={handleInputChange}
                      required
                      autoComplete="off"
                      style={{ 
                        width: "100%",
                        padding: "1rem", 
                        borderRadius: "12px", 
                        border: "2px solid #9ca3af",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box"
                      }} 
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <input 
                        name="businessPhone"
                        type="tel"
                        placeholder="Business Phone *" 
                        value={formData.businessPhone}
                        onChange={handleInputChange}
                        required
                        autoComplete="off"
                        style={{ 
                          width: "100%",
                          padding: "1rem", 
                          borderRadius: "12px", 
                          border: "2px solid #9ca3af",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box"
                        }} 
                      />
                      <select 
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        required
                        autoComplete="off"
                        style={{ 
                          width: "100%",
                          padding: "1rem", 
                          borderRadius: "12px", 
                          border: "2px solid #9ca3af",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                          backgroundColor: "white",
                          boxSizing: "border-box"
                        }}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="JPY">JPY</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </div>
            </>
          )}

          {currentStep === 3 && (
            <>
                    <input 
                      name="website"
                      type="url"
                      placeholder="Website (optional)" 
                      value={formData.website}
                      onChange={handleInputChange}
                      autoComplete="off"
                      style={{ 
                        width: "100%",
                        padding: "1rem", 
                        borderRadius: "12px", 
                        border: "2px solid #9ca3af",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box"
                      }} 
                    />
                    <input 
                      name="vatNumber"
                      placeholder="VAT/Tax Number (optional)" 
                      value={formData.vatNumber}
                      onChange={handleInputChange}
                      autoComplete="off"
                      style={{ 
                        width: "100%",
                        padding: "1rem", 
                        borderRadius: "12px", 
                        border: "2px solid #9ca3af",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box"
                      }} 
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "1rem", color: "#1f2937", fontWeight: "600" }}>
                          Opening Time
                        </label>
                        <input 
                          name="openTime"
                          type="time"
                          value={formData.openTime}
                          onChange={handleInputChange}
                          autoComplete="off"
                          style={{ 
                            width: "100%",
                            padding: "1rem", 
                            borderRadius: "12px", 
                            border: "2px solid #9ca3af",
                            fontSize: "1rem",
                            outline: "none",
                            transition: "border-color 0.2s",
                            boxSizing: "border-box",
                            cursor: "pointer",
                            backgroundColor: "white"
                          }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "1rem", color: "#1f2937", fontWeight: "600" }}>
                          Closing Time
                        </label>
                        <input 
                          name="closeTime"
                          type="time"
                          value={formData.closeTime}
                          onChange={handleInputChange}
                          autoComplete="off"
                          style={{ 
                            width: "100%",
                            padding: "1rem", 
                            borderRadius: "12px", 
                            border: "2px solid #9ca3af",
                            fontSize: "1rem",
                            outline: "none",
                            transition: "border-color 0.2s",
                            boxSizing: "border-box",
                            cursor: "pointer",
                            backgroundColor: "white"
                          }} 
                        />
                      </div>
                    </div>
            </>
          )}

          {currentStep === 4 && (
                  <div style={{ padding: "1.5rem", backgroundColor: "#f8fafc", borderRadius: "12px" }}>
                    <h3 style={{ marginBottom: "1rem", color: "#374151", fontSize: "1.25rem" }}>Review Your Information</h3>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      <div>
                        <strong style={{ color: "#374151" }}>Account Details:</strong>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Name: {formData.firstName} {formData.lastName}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Email: {formData.email}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Owner Username: {formData.ownerUsername}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Phone: {formData.phone || "Not provided"}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
                          <span style={{ fontSize: "0.9rem", color: "#374151" }}>Owner Icon:</span>
                          <div style={{ width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#e5e7eb" }}>
                            <img
                              src={`/images/icons/${selectedOwnerIcon.name}.png`}
                              alt={selectedOwnerIcon.label}
                              style={{ width: "42px", height: "42px", objectFit: "cover" }}
                            />
                          </div>
                          <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>{selectedOwnerIcon.label}</span>
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: "#374151" }}>Business Information:</strong>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Business Name: {formData.businessName}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Type: {formData.businessType}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Address: {formData.businessAddress}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Phone: {formData.businessPhone}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Currency: {formData.currency}</p>
                      </div>
                      <div>
                        <strong style={{ color: "#374151" }}>Contact Details:</strong>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Website: {formData.website || "Not provided"}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>VAT Number: {formData.vatNumber || "Not provided"}</p>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Business Hours: {formData.openTime} - {formData.closeTime}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

          {/* Navigation Buttons */}
              <div style={{ 
                marginTop: "2rem", 
                display: "flex", 
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "2rem",
                borderTop: "1px solid #e5e7eb"
              }}>
            {currentStep > 1 ? (
                  <button 
                    type="button" 
                    onClick={() => setCurrentStep(currentStep - 1)} 
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "#e5e7eb",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "1.5rem",
                      color: "#374151"
                    }}
                  >
                    ←
                  </button>
                ) : (
                  <div />
                )}

                {currentStep === steps.length ? (
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      ...buttonStyle,
                      padding: "0.875rem 2rem",
                      fontSize: "1rem",
                      fontWeight: "600",
                      opacity: isSubmitting ? 0.7 : 1,
                      cursor: isSubmitting ? "not-allowed" : "pointer"
                    }}
                  >
                    {isSubmitting ? "Creating Account..." : "Submit"}
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < steps.length ? (
                  <button 
                    type="button" 
                    onClick={() => setCurrentStep(currentStep + 1)} 
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "#7d8d86",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "1.5rem",
                      color: "#f1f0e4",
                      transition: "background-color 0.2s ease"
                    }}
                  >
                    →
                  </button>
                ) : (
                  <div />
                )}
              </div>
            </form>
          </div>
        </div>
        
        {/* Login link */}
        <div style={{ 
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          justifyContent: "center",
          marginTop: "1.5rem"
        }}>
          <p style={{ 
            textAlign: "center", 
            color: "white",
            fontSize: "1.25rem",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
            margin: 0
          }}>
            Already have an account?{" "}
            <Link to="/login" style={{ 
              color: "#f1f0e4", 
              fontWeight: "600",
              textDecoration: "underline",
              transition: "color 0.2s ease"
            }}>
              Sign in
            </Link>
          </p>
        </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Signup;
