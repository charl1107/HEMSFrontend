import { describe, expect, it } from 'vitest'
import { landingRoute } from './landing-route'

describe('landingRoute', () => {
  it('sends Admin to dashboard', () => {
    expect(landingRoute(['Admin'])).toEqual({ name: 'dashboard' })
  })

  it('sends Department Head to dashboard', () => {
    expect(landingRoute(['Department Head'])).toEqual({ name: 'dashboard' })
  })

  it('sends Event Coordinator to dashboard', () => {
    expect(landingRoute(['Event Coordinator'])).toEqual({ name: 'dashboard' })
  })

  it('sends Instructor to dashboard', () => {
    expect(landingRoute(['Instructor'])).toEqual({ name: 'dashboard' })
  })

  it('sends Student Officer to dashboard', () => {
    expect(landingRoute(['Student Officer'])).toEqual({ name: 'dashboard' })
  })

  it('sends Student to student-dashboard', () => {
    expect(landingRoute(['Student'])).toEqual({ name: 'student-dashboard' })
  })

  it('sends user with no roles to student-dashboard', () => {
    expect(landingRoute([])).toEqual({ name: 'student-dashboard' })
  })

  it('prefers Admin when user has multiple roles', () => {
    expect(landingRoute(['Student', 'Admin'])).toEqual({ name: 'dashboard' })
  })
})
