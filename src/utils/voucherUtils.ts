// src/utils/voucherUtils.ts

/**
 * Generates a unique voucher code
 * Format: VCH-XXXX-XXXX-XXXX
 */
export const generateVoucherCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = 3;
  const segmentLength = 4;
  
  const code = Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  ).join('-');
  
  return `VCH-${code}`;
};

/**
 * Formats discount value for display
 */
export const formatDiscount = (
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number
): string => {
  if (discountType === 'percentage') {
    return `${discountValue}% off`;
  } else {
    return `€${discountValue.toFixed(2)} off`;
  }
};

/**
 * Calculates discount amount from voucher
 */
export const calculateVoucherDiscount = (
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number,
  subtotal: number
): number => {
  if (discountType === 'percentage') {
    return (subtotal * discountValue) / 100;
  } else {
    return Math.min(discountValue, subtotal);
  }
};
