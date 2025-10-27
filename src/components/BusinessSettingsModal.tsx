import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBusiness } from '../contexts/BusinessContext';
import { useBranch } from '../contexts/BranchContext';
import { supabase } from '../lib/supabaseClient';
import styles from './BusinessSettingsModal.module.css';

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BusinessForm = {
  logo?: File | null;
  logoPreview?: string | null;
  name: string;
  displayName: string;
  type: string;
  website: string;
  description: string;
  address: string;
  phone: string;
  vat: string;
  currency: string;
  timezone: string;
  hours: string;
  receiptFooter: string;
  clickAndCollectEnabled: boolean;
};

const SECTION_IDS = [
  { id: "branding", label: "Branding" },
  { id: "basic", label: "Basic Info" },
  { id: "contact", label: "Contact" },
  { id: "biz", label: "Business Settings" },
  { id: "receipt", label: "Receipt" },
  { id: "manual", label: "User Manual" },
] as const;


const SectionCard = React.forwardRef<
  HTMLDivElement,
  { id: string; title: string; children: React.ReactNode }
>(function SectionCard({ id, title, children }, ref) {
  return (
    <section id={id} ref={ref as any} className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionCard}>
        {children}
      </div>
    </section>
  );
});

function Grid({ two, children }: { two?: boolean; children: React.ReactNode }) {
  return <div className={`${styles.grid} ${two ? styles.gridTwo : ''}`}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={`${styles.fieldLabel} ${required ? styles.required : ''}`}>
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={styles.fieldTextarea}
          rows={4}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={styles.fieldInput}
        />
      )}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.fieldSelect}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <label className={styles.field}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: description ? '8px' : '0' }}>
        <span className={styles.fieldLabel}>{label}</span>
        <button
          type="button"
          onClick={() => onChange(!value)}
          style={{
            width: '48px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: value ? '#3b82f6' : '#d1d5db',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!value) {
              e.currentTarget.style.backgroundColor = '#9ca3af';
            }
          }}
          onMouseLeave={(e) => {
            if (!value) {
              e.currentTarget.style.backgroundColor = '#d1d5db';
            }
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              position: 'absolute',
              top: '2px',
              left: value ? '26px' : '2px',
              transition: 'left 0.2s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
          />
        </button>
      </div>
      {description && (
        <p style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: 'rgba(255, 255, 255, 0.7)',
          lineHeight: '1.4'
        }}>
          {description}
        </p>
      )}
    </label>
  );
}

function LogoPreview({ src }: { src: string | null | undefined }) {
  return (
    <div className={styles.logoPreview}>
      {src ? (
        <img src={src} alt="logo" />
      ) : (
        <div className={styles.logoPreviewPlaceholder}>No logo</div>
      )}
    </div>
  );
}

const BusinessSettingsModal: React.FC<BusinessSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentBusiness, refreshBusiness } = useBusiness();
  const { selectedBranchId } = useBranch();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [active, setActive] = useState<(typeof SECTION_IDS)[number]["id"]>("branding");

  const [form, setForm] = useState<BusinessForm>({
    logo: null,
    logoPreview: null,
    name: "",
    displayName: "",
    type: "Retail Store",
    website: "",
    description: "",
    address: "",
    phone: "",
    vat: "",
    currency: "USD ($)",
    timezone: "UTC",
    hours: "9:00 AM - 6:00 PM",
    receiptFooter: "Thank you for shopping with us!",
    clickAndCollectEnabled: false,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useMemo(
    () =>
      Object.fromEntries(
        SECTION_IDS.map(({ id }) => [id, React.createRef<HTMLDivElement>()])
      ) as Record<(typeof SECTION_IDS)[number]["id"], React.RefObject<HTMLDivElement>>,
    []
  );

  // Load current business data when modal opens
  useEffect(() => {
    if (isOpen && currentBusiness) {
      setForm({
        logo: null,
        logoPreview: currentBusiness.logo_url || null,
        name: currentBusiness.name || "",
        displayName: currentBusiness.business_name || currentBusiness.name || "",
        type: currentBusiness.business_type || "Retail Store",
        website: currentBusiness.website || "",
        description: currentBusiness.description || "",
        address: currentBusiness.address || "",
        phone: currentBusiness.phone_number || "",
        vat: currentBusiness.vat_number || "",
        currency: currentBusiness.currency ? `${currentBusiness.currency} (${getCurrencySymbol(currentBusiness.currency)})` : "USD ($)",
        timezone: currentBusiness.timezone || "UTC",
        hours: currentBusiness.business_hours || "9:00 AM - 6:00 PM",
        receiptFooter: currentBusiness.receipt_footer || "Thank you for shopping with us!",
        clickAndCollectEnabled: currentBusiness.click_and_collect_enabled || false,
      });
    }
  }, [isOpen, currentBusiness]);

  useEffect(() => {
    if (!isOpen) return;
    setActive("branding");
  }, [isOpen]);


  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
    };
    return symbols[currency] || '$';
  };

  const go = (id: (typeof SECTION_IDS)[number]["id"]) => {
    const el = sectionRefs[id].current;
    if (!el || !scrollRef.current) return;
    
    // Immediately update active state
    setActive(id);
    
    // Then scroll to the section
    scrollRef.current.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
  };

  const update = (patch: Partial<BusinessForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const onPickLogo: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    update({ logo: file, logoPreview: url });
  };

  const uploadLogo = async (file: File, branchId: number): Promise<string | null> => {
    try {
      if (!currentBusiness?.business_id || !branchId) {
        throw new Error('Business ID and Branch ID are required for logo upload');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `business-logos/${currentBusiness.business_id}/${branchId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        });
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!currentBusiness) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let logoUrl = form.logoPreview;

      // Upload new logo if selected
      if (form.logo) {
        const uploadedLogoUrl = await uploadLogo(form.logo, selectedBranchId);
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl;
        }
      }

      // Extract currency code from display format
      const currencyCode = form.currency.split(' ')[0];

      // Update business info
      const { error: updateError } = await supabase
        .from('business_info')
        .update({
          name: form.name,
          business_name: form.displayName,
          business_type: form.type,
          description: form.description,
          address: form.address,
          phone_number: form.phone || null,
          vat_number: form.vat || null,
          website: form.website || null,
          business_hours: form.hours || null,
          currency: currencyCode,
          timezone: form.timezone,
          receipt_footer: form.receiptFooter,
          logo_url: logoUrl || null,
          click_and_collect_enabled: form.clickAndCollectEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', currentBusiness.business_id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      await refreshBusiness();
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);

    } catch (error) {
      console.error('Error updating business info:', error);
      setError(error instanceof Error ? error.message : 'Failed to update business information');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setActive("branding");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.visible : styles.hidden}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <aside
        className={`${styles.drawer} ${isOpen ? styles.open : ''}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Gradient overlays to match navbar */}
        <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '220px',
              height: '220px',
              top: '-120px',
              left: '-120px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 70%)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '260px',
              height: '260px',
              bottom: '-80px',
              right: '-140px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at center, rgba(255, 150, 0, 0.12) 0%, rgba(255, 150, 0, 0) 70%)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.25) 45%, rgba(0, 0, 0, 0.6) 100%)'
            }}
          />
        </div>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>
              SETTINGS
            </h2>
          </div>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            [X]
          </button>
        </div>

        {/* Success/Error Messages */}
        {(success || error) && (
          <div className={styles.messages}>
            {success && (
              <div className={styles.successMessage}>
                ✓ Business information updated successfully!
              </div>
            )}
            {error && (
              <div className={styles.errorMessage}>
                ⚠ {error}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>
          {/* Left Nav */}
          <nav className={styles.nav}>
            <ul className={styles.navList}>
              {SECTION_IDS.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => go(s.id)}
                    className={`${styles.navButton} ${active === s.id ? styles.active : ''}`}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right content */}
          <div className={styles.content}>
            {/* Top tabs on small screens */}
            <div className={styles.mobileTabs}>
              <div className={styles.mobileTabsList}>
                {SECTION_IDS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => go(s.id)}
                    className={`${styles.mobileTabButton} ${active === s.id ? styles.active : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable content */}
            <div ref={scrollRef} className={styles.scrollContent}>
              {/* Branding */}
              <SectionCard id="branding" ref={sectionRefs.branding} title="Branding">
                <div className={styles.logoSection}>
                  <LogoPreview src={form.logoPreview} />
                  <div>
                    <label className={styles.logoUpload}>Business Logo</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={onPickLogo}
                      className={styles.logoFileInput}
                      id="logo-input"
                    />
                    <label htmlFor="logo-input" className={styles.logoFileButton}>
                      Choose File
                    </label>
                    <p className={styles.logoHelpText}>Recommended: 200×200px, PNG or JPG</p>
                  </div>
                </div>
              </SectionCard>

              {/* Basic Info */}
              <SectionCard id="basic" ref={sectionRefs.basic} title="Basic Information">
                <Grid two>
                  <Field 
                    label="Business Name" 
                    value={form.name} 
                    onChange={(v) => update({ name: v })} 
                    placeholder="Enter your legal business name"
                    required
                  />
                  <Field 
                    label="Display Name" 
                    value={form.displayName} 
                    onChange={(v) => update({ displayName: v })} 
                    placeholder="Enter your business display name"
                  />
                  <Select 
                    label="Business Type" 
                    value={form.type} 
                    onChange={(v) => update({ type: v })} 
                    options={["Retail Store", "Restaurant", "Café", "Salon/Spa", "Service Business", "Other"]} 
                  />
                  <Field 
                    label="Website" 
                    value={form.website} 
                    onChange={(v) => update({ website: v })} 
                    placeholder="https://yourwebsite.com" 
                  />
                </Grid>
                <Field 
                  label="Description" 
                  value={form.description} 
                  onChange={(v) => update({ description: v })} 
                  multiline 
                  placeholder="Brief description of your business..." 
                />
              </SectionCard>

              {/* Contact */}
              <SectionCard id="contact" ref={sectionRefs.contact} title="Contact Information">
                <Field 
                  label="Address" 
                  value={form.address} 
                  onChange={(v) => update({ address: v })} 
                  placeholder="Enter your complete business address"
                  required
                />
                <Grid two>
                  <Field 
                    label="Phone Number" 
                    value={form.phone} 
                    onChange={(v) => update({ phone: v })} 
                    placeholder="+1 (555) 123-4567" 
                  />
                  <Field 
                    label="VAT/Tax Number" 
                    value={form.vat} 
                    onChange={(v) => update({ vat: v })} 
                    placeholder="Enter tax ID" 
                  />
                </Grid>
              </SectionCard>

              {/* Business Settings */}
              <SectionCard id="biz" ref={sectionRefs.biz} title="Business Settings">
                <Grid two>
                  <Select 
                    label="Currency" 
                    value={form.currency} 
                    onChange={(v) => update({ currency: v })} 
                    options={["USD ($)", "EUR (€)", "GBP (£)", "CAD (C$)", "AUD (A$)", "JPY (¥)"]} 
                  />
                  <Select 
                    label="Timezone" 
                    value={form.timezone} 
                    onChange={(v) => update({ timezone: v })} 
                    options={["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo"]} 
                  />
                </Grid>
                <Field 
                  label="Business Hours" 
                  value={form.hours} 
                  onChange={(v) => update({ hours: v })} 
                  placeholder="Mon-Fri 9AM-6PM, Sat 10AM-4PM" 
                />
                <Toggle
                  label="Click & Collect"
                  value={form.clickAndCollectEnabled}
                  onChange={(v) => update({ clickAndCollectEnabled: v })}
                  description="Allow customers to create shopping lists and collect orders in-store"
                />
              </SectionCard>

              {/* Receipt */}
              <SectionCard id="receipt" ref={sectionRefs.receipt} title="Receipt Footer">
                <Field 
                  label="Footer Text" 
                  value={form.receiptFooter} 
                  onChange={(v) => update({ receiptFooter: v })} 
                  multiline 
                  placeholder="Thank you for your business! Visit us again soon."
                />
              </SectionCard>

              {/* User Manual */}
              <SectionCard id="manual" ref={sectionRefs.manual} title="User Manual">
                <a
                  href="/documentation/TillPoint POS – Onboarding Guide (Workflows Addendum).pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s ease',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <i className="fa-solid fa-book" style={{ fontSize: '20px', color: '#ffffff' }}></i>
                  <span>Open User Manual</span>
                </a>
              </SectionCard>

              <div className={styles.spacer} />
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className={styles.footer}>
          <div className={styles.footerContent}>
            <button 
              onClick={handleClose} 
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default BusinessSettingsModal;