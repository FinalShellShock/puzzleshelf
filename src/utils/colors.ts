import type { UserColor, Shelf } from '../types'

export const USER_COLORS: UserColor[] = [
  { name: 'Gold',     hex: '#C8923E' },
  { name: 'Ocean',    hex: '#2E7D7B' },
  { name: 'Coral',    hex: '#C2724E' },
  { name: 'Plum',     hex: '#7B5EA7' },
  { name: 'Storm',    hex: '#4A7BA7' },
  { name: 'Rose',     hex: '#B5687A' },
  { name: 'Mulberry', hex: '#893A5E' },
  { name: 'Dusk',     hex: '#7B8EC2' },
]

// Warm greige used for former members — neutral but fits the palette
export const FORMER_MEMBER_COLOR = '#A09890'

export function getColorByName(name: string): UserColor | undefined {
  return USER_COLORS.find(c => c.name === name)
}

export function getColorByHex(hex: string): UserColor | undefined {
  return USER_COLORS.find(c => c.hex === hex)
}

export function getAvailableColors(takenHexes: string[]): UserColor[] {
  return USER_COLORS.filter(c => !takenHexes.includes(c.hex))
}

/** Returns the display color for any userId — grey for former members. */
export function getMemberColor(shelf: Shelf, userId: string): string {
  if (shelf.members[userId]) return shelf.members[userId].color
  if (shelf.formerMembers?.[userId]) return FORMER_MEMBER_COLOR
  return FORMER_MEMBER_COLOR
}

/** Returns the display name for any userId, including former members. */
export function getMemberName(shelf: Shelf, userId: string): string {
  if (shelf.members[userId]) return shelf.members[userId].displayName
  if (shelf.formerMembers?.[userId]) return shelf.formerMembers[userId].displayName
  return 'Unknown'
}
