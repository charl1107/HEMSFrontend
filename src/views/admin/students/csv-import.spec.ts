import { describe, expect, it } from 'vitest'
import { DEFAULT_STUDENT_PASSWORD } from './student-form'
import { CSV_TEMPLATE_HEADER, csvRowToPayload, parseStudentsCsv } from './csv-import'

describe('parseStudentsCsv', () => {
  it('parses quoted multiline fields', () => {
    const result = parseStudentsCsv('studentId,firstName,lastName,email,program,yearLevel\n1,Jamie,Cruz,j@example.edu,"Hospitality,\nManagement",2,,true')
    expect(result.errors).toEqual([])
    expect(result.rows[0].program).toBe('Hospitality,\nManagement')
  })

  it('rejects short passwords and invalid active values', () => {
    const result = parseStudentsCsv('studentId,firstName,lastName,email,program,yearLevel,password,isActive\n1,J,C,j@example.edu,HM,2,short,sometimes')
    expect(result.rows).toHaveLength(0)
    expect(result.errors[0]).toContain('password')
    expect(result.errors[0]).toContain('isActive')
  })

  it('uses the default first-login password for blank password cells', () => {
    const result = parseStudentsCsv('studentId,firstName,lastName,email,program,yearLevel,password,isActive\n1,Jamie,Cruz,j@example.edu,HM,2,,true')
    expect(result.rows[0].password).toBe(DEFAULT_STUDENT_PASSWORD)
    // The server sets mustChangePassword: true on every created account, so the
    // frontend only has to send the default password — never the flag itself.
    expect(csvRowToPayload(result.rows[0]).password).toBe(DEFAULT_STUDENT_PASSWORD)
  })

  it('defaults a blank Role cell to Student', () => {
    const result = parseStudentsCsv('role,studentId,firstName,lastName,email,program,yearLevel\n,1,Jamie,Cruz,j@example.edu,HM,2')
    expect(result.errors).toEqual([])
    expect(result.rows[0].role).toBe('Student')
    expect(csvRowToPayload(result.rows[0]).roles).toEqual(['Student'])
  })

  it('matches the header row case-insensitively', () => {
    const result = parseStudentsCsv('Role,StudentId,FirstName,LastName,Email,Program,YearLevel\nInstructor,,Jamie,Cruz,j@example.edu,,')
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].role).toBe('Instructor')
  })

  it('requires studentId only for Student rows', () => {
    const student = parseStudentsCsv('studentId,firstName,lastName,email,program,yearLevel\n,Jamie,Cruz,j@example.edu,HM,2')
    expect(student.rows).toHaveLength(0)
    expect(student.errors[0]).toContain('studentId')

    const instructor = parseStudentsCsv('role,studentId,firstName,lastName,email,program,yearLevel\nInstructor,,Jamie,Cruz,j@example.edu,,')
    expect(instructor.errors).toEqual([])
    expect(instructor.rows).toHaveLength(1)
  })

  it('keeps a given role and drops student fields from non-student payloads', () => {
    const result = parseStudentsCsv('role,studentId,firstName,lastName,email,program,yearLevel\nEvent Coordinator,,Jamie,Cruz,j@example.edu,HM,2')
    expect(result.errors).toEqual([])
    const payload = csvRowToPayload(result.rows[0])
    expect(payload.roles).toEqual(['Event Coordinator'])
    expect(payload).not.toHaveProperty('studentId')
    expect(payload).not.toHaveProperty('program')
    expect(payload).not.toHaveProperty('yearLevel')
  })

  it('ships the downloadable template with the Role column first', () => {
    expect(CSV_TEMPLATE_HEADER).toBe(
      'role,studentId,firstName,middleName,lastName,suffix,email,program,yearLevel,password,isActive',
    )
  })
})
