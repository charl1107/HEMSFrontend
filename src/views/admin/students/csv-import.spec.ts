import { describe, expect, it } from 'vitest'
import { DEFAULT_STUDENT_PASSWORD } from './student-form'
import { parseStudentsCsv } from './csv-import'

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
  })
})
