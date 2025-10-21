# TillPoint POS - Color Theme Documentation

## Overview
The TillPoint POS system uses a modern, clean, and professional color palette with warm, earthy undertones that complement the African-themed background. The design maintains excellent contrast ratios and accessibility considerations.

## Primary Color Palette

### Base Colors
- **Main Background**: `#f8f9fa` (Light gray with African-themed background image)
- **Card Backgrounds**: `#ffffff` (Pure white)
- **Primary Text**: `#1a1a1a` (Dark charcoal)
- **Secondary Text**: `#4b5563` (Improved contrast gray)
- **Light Text**: `#f1f0e4` (Cream/beige)

### Interactive Elements
- **Primary Buttons**: `#1a1a1a` (Dark) with `#f1f0e4` (Light text)
- **Secondary Buttons**: `#7d8d86` (Sage green) with `#f1f0e4` (Light text)
- **Accent Buttons**: `#bca88d` (Beige) with `#3e3f29` (Dark text)
- **Hover States**: `#374151` (Darker gray for primary), `#bca88d` (Lighter beige for secondary)

### Status & Alert Colors
- **Success**: `#10b981`, `#059669` (Green)
- **Warning**: `#fbbf24`, `#f59e0b`, `#d97706` (Amber/Orange)
- **Danger**: `#dc2626`, `#ef4444` (Red)
- **Info**: `#3b82f6` (Blue)

## Navigation Theme
- **Sidebar Background**: `#1a1a1a` (Dark)
- **Active Navigation**: `#333333` (Dark gray)
- **Navigation Text**: `#ffffff` (White for active), `#cccccc` (Light gray for inactive)

## Dashboard-Specific Colors

### Card Styling
- **Card Borders**: `#9ca3af` (Improved contrast gray, 2px solid)
- **Card Shadows**: `rgba(62, 63, 41, 0.1)` (Warm, earthy shadow)
- **Card Backgrounds**: `#ffffff` (White)

### Dashboard Components
- **Sales Card Icon**: `#1a1a1a` background with `#f1f0e4` icon
- **Transactions Card Icon**: `#bca88d` background with `#1a1a1a` icon
- **Low Stock Card**: Dynamic - `#10b981` (Green) when no issues, `#fbbf24` (Amber) when items need restocking
- **Top Products Card**: `#bca88d` background with `#3e3f29` icon

### Chart & Data Visualization
- **Chart Colors**: Multi-color palette
  - `#3b82f6` (Blue)
  - `#10b981` (Green)
  - `#f59e0b` (Orange)
  - `#ef4444` (Red)
  - `#8b5cf6` (Purple)
  - `#06b6d4` (Cyan)
  - `#f97316` (Orange-red)
- **Pie Chart**: `#dc2626` (Red) for products, `#f59e0b` (Orange) for side business
- **Chart Legend Background**: `#3e3f29` (Dark olive)

### Interactive Controls
- **Date Picker**: `#1a1a1a` background with `#bca88d` accents
- **Period Filters**: `#f9fafb` background with `#7d8d86` active states
- **Navigation Icons**: `#bca88d` for inactive, `#1a1a1a` for active

## Calendar Theme (Supplier Calendar)

### Day Colors
- **Sunday**: `#fef2f2` (Light Red)
- **Monday**: `#fefce8` (Light Yellow)
- **Tuesday**: `#f0fdf4` (Light Green)
- **Wednesday**: `#eff6ff` (Light Blue)
- **Thursday**: `#faf5ff` (Light Purple)
- **Friday**: `#fef3c7` (Light Amber)
- **Saturday**: `#f5f3ff` (Light Indigo)
- **Today**: `#dbeafe` (Light Blue) with `#3b82f6` border

### Calendar Elements
- **Time Grid**: `#d1d5db` borders
- **Event Blocks**: `#1a1a1a` text with `#1a1a1a` left border
- **Hover Effects**: `rgba(59, 130, 246, 0.05)` (Subtle blue tint)

## Modal & Overlay Colors
- **Modal Background**: `rgba(0, 0, 0, 0.5)` (Semi-transparent dark)
- **Modal Content**: `#ffffff` (White)
- **Modal Borders**: `rgba(125, 141, 134, 0.2)` (Subtle sage border)
- **Modal Headers**: `#1a1a1a` (Dark text)

## Special Features

### Glassmorphism Effects
- **Glass**: `rgba(255, 255, 255, 0.1)` background with blur
- **Glass Dark**: `rgba(0, 0, 0, 0.1)` background with blur

### Role-Based Colors (User Management)
- **Admin**: `#dc2626` (Red)
- **Owner**: `#7c3aed` (Purple)
- **Manager**: `#ea580c` (Orange)
- **Cashier**: `#2563eb` (Blue)
- **Default**: `#6b7280` (Gray)

### Transaction Status Colors
- **Completed**: `#10b981` (Green)
- **Pending**: `#f59e0b` (Amber)
- **Partial Payment**: `#fef2f2` background with `#fecaca` border

### Ranking Indicators
- **#1 (Gold)**: `#fbbf24`
- **#2 (Silver)**: `#e5e7eb`
- **#3 (Bronze)**: `#f59e0b`

## Typography
- **Font Families**: Quicksand and Comfortaa (playful, modern fonts)
- **Font Weights**: 300-700 range for different text hierarchy
- **Playful Font Classes**: `.font-playful`, `.font-playful-bold`, `.font-playful-light`

## Border & Shadow System
- **Standard Borders**: `#9ca3af`, `#d1d5db` (Improved contrast grays)
- **Card Shadows**: `0 4px 12px rgba(62, 63, 41, 0.1)` (Warm, earthy)
- **Modal Shadows**: `0 20px 40px rgba(0, 0, 0, 0.3)` (Strong shadow)

## Accessibility Considerations
- High contrast ratios between text and backgrounds (WCAG AA compliant)
- Secondary text meets 4.5:1 contrast ratio minimum
- Border visibility improved for better UI element distinction
- Color-blind friendly palette with multiple indicators (not just color)
- Clear visual hierarchy with consistent spacing and typography
- Hover states and focus indicators for all interactive elements

## Usage Guidelines
1. **Primary Actions**: Use dark (`#1a1a1a`) buttons with light text
2. **Secondary Actions**: Use sage green (`#7d8d86`) or beige (`#bca88d`) buttons
3. **Status Indicators**: Use semantic colors (green for success, red for danger, etc.)
4. **Cards**: Always use white backgrounds with light gray borders and warm shadows
5. **Text Hierarchy**: Use dark charcoal for primary text, improved contrast gray for secondary
6. **Interactive Elements**: Provide clear hover and focus states

## Color Variables (CSS Custom Properties)
```css
:root {
  --primary-bg: #f8f9fa;
  --card-bg: #ffffff;
  --primary-text: #1a1a1a;
  --secondary-text: #4b5563;
  --light-text: #f1f0e4;
  --primary-button: #1a1a1a;
  --secondary-button: #7d8d86;
  --accent-button: #bca88d;
  --success: #10b981;
  --warning: #fbbf24;
  --danger: #dc2626;
  --info: #3b82f6;
  --border-light: #9ca3af;
  --shadow-warm: rgba(62, 63, 41, 0.1);
}
```

---
*Last updated: [Current Date]*
*Theme maintains consistency across all components while providing clear visual hierarchy and excellent user experience.*
