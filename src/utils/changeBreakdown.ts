export type DenominationType = 'note' | 'coin'

export interface ChangeBreakdownItem {
  denomination: number
  count: number
  type: DenominationType
  label: string
  image?: string
}

const EURO_DENOMINATIONS: Array<{
  value: number
  type: DenominationType
  label: string
  image: string
}> = [
  { value: 500, type: 'note', label: '€500', image: 'images/money/500euro.png' },
  { value: 200, type: 'note', label: '€200', image: 'images/money/200euro.png' },
  { value: 100, type: 'note', label: '€100', image: 'images/money/100euro.png' },
  { value: 50, type: 'note', label: '€50', image: 'images/money/50euro.png' },
  { value: 20, type: 'note', label: '€20', image: 'images/money/20euro.png' },
  { value: 10, type: 'note', label: '€10', image: 'images/money/10euro.jpeg' },
  { value: 5, type: 'note', label: '€5', image: 'images/money/5euro.png' },
  { value: 2, type: 'coin', label: '€2', image: 'images/money/2euro.jpg' },
  { value: 1, type: 'coin', label: '€1', image: 'images/money/1euro.png' },
  { value: 0.5, type: 'coin', label: '50c', image: 'images/money/50cent.jpg' },
  { value: 0.2, type: 'coin', label: '20c', image: 'images/money/20cent.png' },
  { value: 0.1, type: 'coin', label: '10c', image: 'images/money/10cent.png' },
  { value: 0.05, type: 'coin', label: '5c', image: 'images/money/5cent.png' },
  { value: 0.02, type: 'coin', label: '2c', image: 'images/money/2cent.jpg' },
  { value: 0.01, type: 'coin', label: '1c', image: 'images/money/1cent.png' }
]

export const calculateChangeBreakdown = (changeAmount: number): ChangeBreakdownItem[] => {
  if (changeAmount <= 0) {
    return []
  }

  let remaining = Math.round(changeAmount * 100) / 100
  const breakdown: ChangeBreakdownItem[] = []

  for (const denom of EURO_DENOMINATIONS) {
    const count = Math.floor((remaining + 0.001) / denom.value)

    if (count > 0) {
      breakdown.push({
        denomination: denom.value,
        count,
        type: denom.type,
        label: denom.label,
        image: denom.image
      })

      remaining = Math.round((remaining - count * denom.value) * 100) / 100
    }
  }

  return breakdown
}

