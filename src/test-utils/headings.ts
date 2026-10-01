import type { VueWrapper } from '@vue/test-utils'
import { expect } from 'vitest'

/**
 * Heading levels (h1–h6) of the headings rendered inside the mounted root,
 * in DOM order — the same order axe's `heading-order` rule evaluates.
 */
export function headingLevels(wrapper: VueWrapper): number[] {
  return wrapper
    .findAll('h1, h2, h3, h4, h5, h6')
    .map((heading) => Number(heading.element.tagName.slice(1)))
}

/**
 * Asserts the rendered heading sequence satisfies the two axe rules that
 * failed the QA round (TESTING.md §8.6):
 *  - `page-has-heading-one`: the first heading is a real `<h1>`, and
 *  - `heading-order`: no level jumps by more than one from the previous one.
 */
export function expectSequentialHeadings(wrapper: VueWrapper): void {
  const levels = headingLevels(wrapper)
  const sequence = levels.join(' -> ')
  expect(levels.length, 'expected at least one rendered heading').toBeGreaterThan(0)
  expect(
    levels[0],
    `first heading must be h1 (axe page-has-heading-one); saw: ${sequence}`,
  ).toBe(1)
  levels.slice(1).forEach((level, index) => {
    const previous = levels[index]
    expect(
      level,
      `heading levels must not skip (axe heading-order); saw: ${sequence}`,
    ).toBeLessThanOrEqual(previous + 1)
  })
}
