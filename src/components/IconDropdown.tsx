import React, { useState, useRef, useEffect } from 'react';

interface IconOption {
  name: string;
  label: string;
}

interface IconDropdownProps {
  options: IconOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const IconDropdown: React.FC<IconDropdownProps> = ({ options, value, onChange, placeholder = "Select an icon" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.name === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionName: string) => {
    onChange(optionName);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', maxWidth: '400px', overflow: 'visible' }}>
      {/* Selected Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: '#ffffff',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '0.9375rem',
          color: '#111827',
          outline: 'none',
          boxSizing: 'border-box'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#1a1a1a';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26, 26, 26, 0.1)';
        }}
        onBlur={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {selectedOption ? (
          <>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#f3f4f6',
              flexShrink: 0
            }}>
              <img
                src={`/images/icons/${selectedOption.name}.png`}
                alt={selectedOption.label}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ flex: 1, textAlign: 'left' }}>{selectedOption.label}</span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: 'left', color: '#9ca3af' }}>{placeholder}</span>
        )}
        <svg 
          style={{ 
            width: '18px', 
            height: '18px', 
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.25rem)',
          left: 0,
          right: 0,
          background: '#ffffff',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 50,
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '0.5rem',
          contain: 'layout style'
        }}>
          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {options.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => handleSelect(option.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.4rem 0.5rem',
                    background: option.name === value ? 'rgba(125, 141, 134, 0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (option.name !== value) {
                      e.currentTarget.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (option.name !== value) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    backgroundColor: '#f3f4f6',
                    flexShrink: 0,
                    border: option.name === value ? '2px solid #7d8d86' : 'none'
                  }}>
                    <img
                      src={`/images/icons/${option.name}.png`}
                      alt={option.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#111827',
                    fontWeight: option.name === value ? 600 : 400
                  }}>
                    {option.label}
                  </span>
                  {option.name === value && (
                    <svg 
                      style={{ width: '20px', height: '20px', marginLeft: 'auto', color: '#7d8d86' }}
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IconDropdown;

