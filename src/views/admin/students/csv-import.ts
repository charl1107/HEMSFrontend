import type { CreateUserPayload } from '../../../api/users.api'
import { DEFAULT_STUDENT_PASSWORD } from './student-form'

export interface CsvStudentRow {
  line: number
  role: string
  studentId: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  email: string
  program: string
  yearLevel: string
  password: string
  isActive: boolean
}

export interface CsvParseResult {
  rows: CsvStudentRow[]
  errors: string[]
}

const REQUIRED_HEADERS = ['firstname', 'lastname', 'program', 'yearlevel']

function defaultInstitutionalEmail(studentId: string): string {
  return /^[^@\s]+@chcc\.edu\.ph$/i.test(studentId)
    ? studentId
    : `${studentId}@chcc.edu.ph`
}

function parseRecords(text: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true
    } else if (char === ',') {
      record.push(field.trim())
      field = ''
    } else if (char === '\n' || char === '\r') {
      record.push(field.trim())
      if (record.some((cell) => cell.length > 0)) records.push(record)
      record = []
      field = ''
      if (char === '\r' && text[i + 1] === '\n') i += 1
    } else {
      field += char
    }
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted field.')
  record.push(field.trim())
  if (record.some((cell) => cell.length > 0)) records.push(record)
  return records
}

export function parseStudentsCsv(text: string): CsvParseResult {
  let records: string[][]
  try {
    records = parseRecords(text.replace(/^\uFEFF/, ''))
  } catch (err) {
    return { rows: [], errors: [err instanceof Error ? err.message : 'The CSV could not be parsed.'] }
  }
  if (!records.length) return { rows: [], errors: ['The file is empty.'] }

  const headers = records[0].map((header) => header.toLowerCase())
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
  if (missing.length) {
    return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}.`] }
  }

  const index = (name: string) => headers.indexOf(name)
  const rows: CsvStudentRow[] = []
  const errors: string[] = []
  records.slice(1).forEach((cells, rowIndex) => {
    const line = rowIndex + 2
    const get = (name: string) => (cells[index(name)] ?? '').trim()
    const rawRole = get('role')
    // Blank Role means Student. Any other value goes to the server untouched,
    // so Admin / unknown roles fail with the server's own message on the row.
    const role = rawRole || 'Student'
    const isStudent = role === 'Student'
    const studentId = get('studentid')
    const firstName = get('firstname')
    const middleName = get('middlename')
    const lastName = get('lastname')
    const suffix = get('suffix')
    const email = get('email') || defaultInstitutionalEmail(studentId)
    const program = get('program')
    const yearLevel = get('yearlevel')
    const password = get('password')
    const rawActive = get('isactive').toLowerCase()
    if (![studentId, firstName, middleName, lastName, suffix, email, program, yearLevel, password, rawActive, rawRole].some(Boolean)) return

    const invalid: string[] = []
    if (isStudent && !studentId) invalid.push('studentId')
    if (!firstName) invalid.push('firstName')
    if (!lastName) invalid.push('lastName')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid.push('email')
    // program and yearLevel are parsed for every row but only Student rows
    // carry them, so they are only required (and validated) for those.
    if (isStudent) {
      if (!program) invalid.push('program')
      const year = Number(yearLevel)
      if (!Number.isInteger(year) || year < 1 || year > 4) invalid.push('yearLevel')
    }
    if (password && password.length < 8) invalid.push('password (minimum 8 characters)')
    if (rawActive && !['true', 'false', '1', '0'].includes(rawActive)) invalid.push('isActive (use true/false or 1/0)')
    if (invalid.length) {
      errors.push(`Row ${line}: invalid or missing ${invalid.join(', ')}.`)
      return
    }
    rows.push({
      line,
      role,
      studentId,
      firstName,
      middleName,
      lastName,
      suffix,
      email,
      program,
      yearLevel,
      password: password || DEFAULT_STUDENT_PASSWORD,
      isActive: rawActive ? rawActive === 'true' || rawActive === '1' : true,
    })
  })
  return { rows, errors }
}

export function csvRowToPayload(row: CsvStudentRow): CreateUserPayload {
  const isStudent = row.role === 'Student'
  return {
    email: row.email,
    password: row.password,
    firstName: row.firstName,
    ...(row.middleName ? { middleName: row.middleName } : {}),
    lastName: row.lastName,
    ...(row.suffix ? { suffix: row.suffix } : {}),
    isActive: row.isActive,
    roles: [row.role],
    // Non-student rows keep their parsed program/yearLevel out of the payload.
    ...(isStudent
      ? { studentId: row.studentId, program: row.program, yearLevel: Number(row.yearLevel) }
      : {}),
  }
}

export const CSV_TEMPLATE_HEADER = 'role,studentId,firstName,middleName,lastName,suffix,email,program,yearLevel,password,isActive'
export const CSV_TEMPLATE_EXAMPLE = 'Student,59782024,Jamie,,Cruz,,,BS Hospitality Management,2,,true'
