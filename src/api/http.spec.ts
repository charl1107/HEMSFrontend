import { describe, expect, it } from 'vitest'
import { apiErrorMessage } from './http'

function axiosLike(
  status: number | null,
  data: unknown,
  message = 'Request failed',
): Error {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    ...(status === null
      ? {}
      : { response: { status, data } }),
  })
}

describe('apiErrorMessage', () => {
  it('returns a string server message from a 400 response', () => {
    const err = axiosLike(400, { message: 'endTime must be after startTime' })
    expect(apiErrorMessage(err, 'Failed')).toBe(
      'endTime must be after startTime',
    )
  })

  it('joins NestJS validation message arrays', () => {
    const err = axiosLike(400, {
      message: ['title must be a string', 'deadline must be a date'],
    })
    expect(apiErrorMessage(err, 'Failed')).toBe(
      'title must be a string deadline must be a date',
    )
  })

  it('falls back to the axios message when the body has no message', () => {
    const err = axiosLike(500, {}, 'Request failed with status code 500')
    expect(apiErrorMessage(err, 'Failed')).toBe(
      'Request failed with status code 500',
    )
  })

  it('uses the axios message for network errors without a response', () => {
    const err = axiosLike(null, undefined, 'Network Error')
    expect(apiErrorMessage(err, 'Failed')).toBe('Network Error')
  })

  it('uses a plain Error message', () => {
    expect(apiErrorMessage(new Error('boom'), 'Failed')).toBe('boom')
  })

  it('returns the fallback when nothing else is available', () => {
    expect(apiErrorMessage(null, 'Failed')).toBe('Failed')
    expect(apiErrorMessage(axiosLike(400, {}, ''), 'Failed')).toBe('Failed')
    expect(apiErrorMessage(new Error(''), 'Failed')).toBe('Failed')
  })
})
