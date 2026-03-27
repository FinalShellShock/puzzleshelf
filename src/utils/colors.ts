import type { UserColor, Shelf } from '../types'

export const USER_COLORS: UserColor[] = [
  { name: 'Tomato',      hex: '#E04848' },
  { name: 'Tangerine',   hex: '#E07830' },
  { name: 'Sunshine',    hex: '#C8A020' },
  { name: 'Fern',        hex: '#40A848' },
  { name: 'Violet',      hex: '#7050C8' },
  { name: 'Magenta',     hex: '#C83898' },
  { name: 'Azure',       hex: '#2868C8' },
  { name: 'Raspberry',   hex: '#B82858' },
]

// Neutral gray used for former members — works on both light and dark
export const FORMER_MEMBER_COLOR = '#7888A8'

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
