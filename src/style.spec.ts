/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * Guard spec for the brand rose/magenta accent theme (fixes.docx) and the
 * theme-aware body/html background (U3). Reads the real stylesheet from disk
 * so a stray blue accent literal (the original bug: `--accent-btn: #2563eb`)
 * or a white body/canvas in dark mode fails the suite.
 */
const styleCss = readFileSync(fileURLToPath(new URL('./style.css', import.meta.url)), 'utf8')

const BLUE_ACCENT_LITERALS = ['#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd']

/*
 * Anchored match: only a line that *starts* with `.dark` (word boundary)
 * opens the dark slice. A bare `indexOf('.dark')` could mis-slice if a
 * `.dark`-prefixed substring (e.g. `.dark-surface`) appeared earlier.
 */
function darkBlock(): string {
  const match = styleCss.match(/^\.dark\b/m)
  expect(match, 'style.css must contain a top-level .dark block').not.toBeNull()
  return styleCss.slice(match!.index)
}

describe('style.css brand accent guard', () => {
  it('contains no blue accent literals', () => {
    for (const literal of BLUE_ACCENT_LITERALS) {
      expect(styleCss, `style.css must not contain the blue accent literal ${literal}`).not.toContain(literal)
    }
  })

  it('contains no legacy blue focus-ring rgba literal', () => {
    expect(styleCss, 'style.css must not contain the legacy blue focus-ring rgba(37, 99, 235, …)').not.toContain('rgba(37, 99, 235')
  })

  it('.dark overrides the accent button tokens (dark buttons are rose, not blue)', () => {
    const block = darkBlock()
    expect(block).toContain('--accent-btn: #be185d')
    expect(block).toContain('--accent-btn-hover: #db2777')
  })
})

describe('style.css theme-aware body/html background (U3)', () => {
  it('.dark overrides --ui-surface and --ui-text (no white body / unreadable text in dark mode)', () => {
    const block = darkBlock()
    expect(block).toContain('--ui-surface: #1c1626')
    expect(block).toContain('--ui-text: #f2ecf5')
  })

  it('html/body background uses var(--page) so the canvas matches the page in both themes', () => {
    expect(styleCss).toMatch(/html\s*,\s*body\s*\{[^}]*background:\s*var\(--page\)/)
    expect(styleCss).toMatch(/html\s*,\s*body\s*\{[^}]*min-height:\s*100%/)
  })

  it('#app keeps min-height: 100svh', () => {
    expect(styleCss).toMatch(/#app\s*\{[^}]*min-height:\s*100svh/)
  })
})

describe('style.css screen-reader utility (axe empty-table-header)', () => {
  it('defines .sr-only so visually-hidden table-header text stays available to AT', () => {
    const rule = styleCss.match(/\.sr-only\s*\{[^}]*\}/)
    expect(rule, 'style.css must define the .sr-only utility').not.toBeNull()
    expect(rule?.[0]).toContain('position: absolute')
    expect(rule?.[0]).toContain('width: 1px')
    expect(rule?.[0]).toContain('overflow: hidden')
  })
})
