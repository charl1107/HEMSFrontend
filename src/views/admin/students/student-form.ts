import type { CreateUserPayload } from '../../../api/users.api'

export const DEFAULT_STUDENT_PASSWORD = 'ChccAY2026'

export interface StudentFormValues {
  studentId: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  email: string
  program: string
  yearLevel: string
  password: string
  confirmPassword: string
  isActive: boolean
}

export type StudentFieldErrors = Partial<Record<keyof StudentFormValues, string>>

export function validateStudentForm(values: StudentFormValues): StudentFieldErrors {
  const errors: StudentFieldErrors = {}
  if (!values.studentId.trim()) errors.studentId = 'Student ID is required.'
  if (!values.firstName.trim()) errors.firstName = 'First name is required.'
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.'
  if (!values.email.trim()) errors.email = 'Email address is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Enter a valid email address.'
  if (!values.program.trim()) errors.program = 'Program / Course is required.'
  const year = Number(values.yearLevel)
  if (!values.yearLevel.trim()) errors.yearLevel = 'Year level is required.'
  else if (!Number.isInteger(year) || year < 1 || year > 4)
    errors.yearLevel = 'Year level must be between 1 and 4.'
  if (values.password && values.password.length < 8)
    errors.password = 'Password must be at least 8 characters.'
  if (values.password && !values.confirmPassword) errors.confirmPassword = 'Confirm password is required.'
  else if (values.password && values.password !== values.confirmPassword)
    errors.confirmPassword = 'Passwords do not match.'
  return errors
}

export function hasStudentFieldErrors(errors: StudentFieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}

export function toCreateUserPayload(values: StudentFormValues): CreateUserPayload {
  return {
    email: values.email.trim(),
    password: values.password || DEFAULT_STUDENT_PASSWORD,
    firstName: values.firstName.trim(),
    ...(values.middleName?.trim() ? { middleName: values.middleName.trim() } : {}),
    lastName: values.lastName.trim(),
    ...(values.suffix?.trim() ? { suffix: values.suffix.trim() } : {}),
    isActive: values.isActive,
    roles: ['Student'],
    studentId: values.studentId.trim(),
    program: values.program.trim(),
    yearLevel: Number(values.yearLevel),
  }
}
