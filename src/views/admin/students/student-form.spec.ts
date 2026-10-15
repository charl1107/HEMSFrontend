import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STUDENT_PASSWORD,
  hasStudentFieldErrors,
  toCreateUserPayload,
  validateStudentForm,
  type StudentFormValues,
} from './student-form'

const valid: StudentFormValues = {
  role: 'Student',
  studentId: '2026-001',
  firstName: 'Sam',
  lastName: 'Lee',
  email: 'sam@school.edu',
  program: 'BSHM',
  yearLevel: '1',
  password: 'ChangeMe123!',
  confirmPassword: 'ChangeMe123!',
  isActive: true,
}

describe('validateStudentForm', () => {
  it('accepts a valid form', () => {
    expect(validateStudentForm(valid)).toEqual({})
    expect(hasStudentFieldErrors(validateStudentForm(valid))).toBe(false)
  })

  it('requires profile fields while allowing the default password', () => {
    const errors = validateStudentForm({
      role: 'Student',
      studentId: '', firstName: '', lastName: '', email: '',
      program: '', yearLevel: '', password: '', confirmPassword: '', isActive: true,
    })
    expect(errors).toEqual({
      studentId: 'Student ID is required.',
      firstName: 'First name is required.',
      lastName: 'Last name is required.',
      email: 'Email address is required.',
      program: 'Program / Course is required.',
      yearLevel: 'Year level is required.',
    })
    expect(validateStudentForm({
      role: 'Student',
      studentId: '', firstName: '', lastName: '', email: '',
      program: '', yearLevel: '', password: '', confirmPassword: '', isActive: true,
    })).toEqual({
      studentId: 'Student ID is required.',
      firstName: 'First name is required.',
      lastName: 'Last name is required.',
      email: 'Email address is required.',
      program: 'Program / Course is required.',
      yearLevel: 'Year level is required.',
    })
  })

  it('skips the student-only rules for non-Student roles', () => {
    expect(
      validateStudentForm({
        ...valid,
        role: 'Instructor',
        studentId: '',
        program: '',
        yearLevel: '',
      }),
    ).toEqual({})
  })

  it('rejects invalid email', () => {
    const errors = validateStudentForm({ ...valid, email: 'not-an-email' })
    expect(errors.email).toBe('Enter a valid email address.')
  })

  it('rejects short password', () => {
    const errors = validateStudentForm({ ...valid, password: 'short', confirmPassword: 'short' })
    expect(errors.password).toBe('Password must be at least 8 characters.')
  })

  it('uses the default password when no custom password is provided', () => {
    const result = toCreateUserPayload({ ...valid, password: '', confirmPassword: '' })
    expect(result.password).toBe(DEFAULT_STUDENT_PASSWORD)
  })

  it('rejects mismatched passwords', () => {
    const errors = validateStudentForm({ ...valid, confirmPassword: 'OtherPass1!' })
    expect(errors.confirmPassword).toBe('Passwords do not match.')
  })

  it('rejects invalid year level', () => {
    const errors = validateStudentForm({ ...valid, yearLevel: '9' })
    expect(errors.yearLevel).toBe('Year level must be between 1 and 4.')
  })
})

describe('toCreateUserPayload', () => {
  it('maps to API payload with Student role', () => {
    const payload = toCreateUserPayload(valid)
    expect(payload).toEqual({
      email: 'sam@school.edu',
      password: 'ChangeMe123!',
      firstName: 'Sam',
      lastName: 'Lee',
      isActive: true,
      roles: ['Student'],
      studentId: '2026-001',
      program: 'BSHM',
      yearLevel: 1,
    })
  })

  it('omits the student-only fields for any other role', () => {
    const payload = toCreateUserPayload({
      ...valid,
      role: 'Event Coordinator',
      studentId: '',
      program: '',
      yearLevel: '',
    })
    expect(payload.roles).toEqual(['Event Coordinator'])
    expect(payload).not.toHaveProperty('studentId')
    expect(payload).not.toHaveProperty('program')
    expect(payload).not.toHaveProperty('yearLevel')
  })
})
