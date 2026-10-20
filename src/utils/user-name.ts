import type { SafeUser } from '../api/auth.types'

type NameParts = Pick<SafeUser, 'firstName' | 'lastName'> & {
  middleName?: string | null
  suffix?: string | null
}

export function formatUserDisplayName(user: NameParts | null | undefined): string {
  if (!user) return ''

  const firstName = user.firstName.trim()
  const lastName = user.lastName.trim()
  const middleName = user.middleName?.trim()
  const suffix = user.suffix?.trim()
  const middleInitial = middleName ? ` ${middleName.charAt(0).toLocaleUpperCase()}.` : ''
  const givenNames = `${firstName}${middleInitial}${suffix ? ` ${suffix}` : ''}`

  return lastName ? `${lastName}, ${givenNames}` : givenNames
}
