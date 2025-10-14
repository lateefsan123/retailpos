export interface UserIcon {
  name: string
  label: string
}

interface IconPack {
  name: string
  icons: UserIcon[]
}

export const ICON_PACKS: Record<string, IconPack> = {
  default: {
    name: 'Default Pack',
    icons: [
      { name: 'lily', label: 'Lily' },
      { name: 'chunli', label: 'Chun-Li' },
      { name: 'ken', label: 'Ken' },
      { name: 'kimberly', label: 'Kimberly' },
      { name: 'mai', label: 'Mai' },
      { name: 'manon', label: 'Manon' },
      { name: 'rashid', label: 'Rashid' },
      { name: 'ryu', label: 'Ryu' },
      { name: 'zangief', label: 'Zangief' }
    ]
  },
  modern: {
    name: 'Modern Pack',
    icons: [
      { name: 'alex', label: 'Alex' },
      { name: 'asim', label: 'Asim' },
      { name: 'chisom', label: 'Chisom' },
      { name: 'erika', label: 'Erika' },
      { name: 'fatima', label: 'Fatima' },
      { name: 'john', label: 'John' },
      { name: 'mike', label: 'Mike' },
      { name: 'naomi', label: 'Naomi' },
      { name: 'samira', label: 'Samira' },
      { name: 'terell', label: 'Terell' }
    ]
  }
}

export const DEFAULT_ICON_NAME = 'ryu'

export const ALL_USER_ICONS: UserIcon[] = Object.values(ICON_PACKS).flatMap(
  (pack) => pack.icons
)
