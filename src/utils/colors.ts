import type { UserColor } from '../types'

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

export function getColorByName(name: string): UserColor | undefined {
  return USER_COLORS.find(c => c.name === name)
}

export function getColorByHex(hex: string): UserColor | undefined {
  return USER_COLORS.find(c => c.hex === hex)
}

export function getAvailableColors(takenHexes: string[]): UserColor[] {
  return USER_COLORS.filter(c => !takenHexes.includes(c.hex))
}
