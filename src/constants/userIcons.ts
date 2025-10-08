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
      { name: 'icon10', label: 'Icon 10' },
      { name: 'icon11', label: 'Icon 11' },
      { name: 'icon12', label: 'Icon 12' },
      { name: 'icon13', label: 'Icon 13' },
      { name: 'icon14', label: 'Icon 14' },
      { name: 'icon15', label: 'Icon 15' }
    ]
  }
}

export const DEFAULT_ICON_NAME = 'ryu'

export const ALL_USER_ICONS: UserIcon[] = Object.values(ICON_PACKS).flatMap(
  (pack) => pack.icons
)
