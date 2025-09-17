export interface CurrencyOptions {
  locale?: string
  currency?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export const formatCurrency = (
  amount: number | null | undefined,
  options: CurrencyOptions = {}
): string => {
  const value = typeof amount === 'number' && isFinite(amount) ? amount : 0
  const {
    locale = 'en-IE',
    currency = 'EUR',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value)
  } catch {
    // Fallback if Intl fails
    return `${currency} ${value.toFixed(2)}`
  }
}

export const formatCurrencyCompact = (
  amount: number | null | undefined,
  options: CurrencyOptions = {}
): string => {
  const value = typeof amount === 'number' && isFinite(amount) ? amount : 0
  const { locale = 'en-IE', currency = 'EUR' } = options
  try {
    // Some environments do not support currency + compact; fallback below if needed
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    } as Intl.NumberFormatOptions).format(value)
    // If it returns the currency code without symbol, still acceptable
    return formatted
  } catch {
    // Manual compact fallback
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `${formatCurrency(value / 1_000_000, { ...options, maximumFractionDigits: 1 })}M`
    if (abs >= 1_000) return `${formatCurrency(value / 1_000, { ...options, maximumFractionDigits: 1 })}K`
    return formatCurrency(value, options)
  }
}

