// Available character icons from your project
const AVAILABLE_ICONS = [
  // Character icons
  'alex', 'asim', 'chisom', 'chunli', 'erika', 'fatima', 
  'john', 'ken', 'kimberly', 'lily', 'mai', 'manon', 
  'mike', 'naomi', 'rashid', 'ryu', 'samira', 'terell', 'zangief',
  // Numbered icons
  'icon10', 'icon11', 'icon12', 'icon13', 'icon14', 'icon15'
]

// Gender-based icon mapping using your character icons
const GENDER_ICONS = {
  male: [
    'ken', 'rashid', 'ryu', 'zangief', 'alex', 'asim', 'john', 'mike', 'terell'
  ],
  female: [
    'lily', 'chunli', 'kimberly', 'mai', 'manon', 'chisom', 'erika', 'fatima', 'naomi', 'samira'
  ],
  neutral: [
    'icon10', 'icon11', 'icon12', 'icon13', 'icon14', 'icon15'
  ]
}

/**
 * Get a random icon for a customer based on their gender
 */
export function getRandomCustomerIcon(gender: 'male' | 'female'): string {
  const availableIcons = GENDER_ICONS[gender]
  const randomIndex = Math.floor(Math.random() * availableIcons.length)
  return availableIcons[randomIndex]
}

/**
 * Get all available icons for a specific gender
 */
export function getCustomerIconsByGender(gender: 'male' | 'female'): string[] {
  return GENDER_ICONS[gender]
}

/**
 * Check if an icon is valid for a specific gender
 */
export function isValidIconForGender(icon: string, gender: 'male' | 'female'): boolean {
  return GENDER_ICONS[gender].includes(icon)
}

/**
 * Get a fallback icon when gender is not specified
 */
export function getFallbackCustomerIcon(): string {
  // Use a random neutral icon when gender is not specified
  const neutralIcons = GENDER_ICONS.neutral
  const randomIndex = Math.floor(Math.random() * neutralIcons.length)
  return neutralIcons[randomIndex]
}

/**
 * Generate customer icon based on name if gender is not available
 * This is a simple fallback that assigns icons based on name patterns
 */
export function getIconFromName(name: string): string {
  // Simple heuristic: if name ends with common female endings, assign female icon
  const femaleEndings = ['a', 'e', 'i', 'y']
  const lastName = name.trim().split(' ').pop()?.toLowerCase() || ''
  
  if (femaleEndings.some(ending => lastName.endsWith(ending))) {
    return getRandomCustomerIcon('female')
  } else {
    return getRandomCustomerIcon('male')
  }
}

/**
 * Get all available icons
 */
export function getAllAvailableIcons(): string[] {
  return AVAILABLE_ICONS
}

/**
 * Get icons by gender including neutral icons
 */
export function getIconsByGender(gender?: 'male' | 'female'): string[] {
  if (gender) {
    return [...GENDER_ICONS[gender], ...GENDER_ICONS.neutral]
  }
  return GENDER_ICONS.neutral
}
