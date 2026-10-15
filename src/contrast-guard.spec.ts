/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * Guard spec for the U14 / axe colour-contrast remediation (Task 21).
 *
 * Task 15's live axe pass found three light-mode serious violations, all the
 * same grey-placeholder pattern (`var(--gray-400)` = #9ca3af, ≈2.53:1 on light
 * surfaces, needs 4.5:1):
 *   .my-attendance__readonly        (MyAttendanceView  — U14, removed in the events-only rework)
 *   .approvals__cover-placeholder   (ApprovalQueueView, removed in the events-only rework)
 *   .event-detail__description--empty (EventDetailView)
 * plus a fourth grep hit outside the axe sample:
 *   .ui-event-card__placeholder     (EventCard)
 *
 * Every TEXT use on a light surface must now be `var(--muted)` (#6b7280,
 * 4.83:1 on white; #a696b0 ≈6.3:1 on the dark surface — safe in both themes).
 * The sweep below covers every .vue file under src/ so none can come back.
 * style.css keeps the `--gray-400` token *definition* itself: a definition is
 * not a text use, and the sweep is scoped to .vue files per the task brief.
 */

const srcDir = fileURLToPath(new URL('.', import.meta.url))

function collectVueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectVueFiles(full, out)
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      out.push(full)
    }
  }
  return out
}

const vueFiles = collectVueFiles(srcDir)

/**
 * The token sweep must also catch CSS fallback forms such as
 * `var(--gray-400, #d1d5db)` — a `\)` right after `400` would miss them.
 */
const grayTokenPattern = /var\(--gray-400\b/

/** Paths (relative to src/, forward slashes) of .vue files matching pattern. */
function offenders(pattern: RegExp): string[] {
  return vueFiles
    .filter((file) => pattern.test(readFileSync(file, 'utf8')))
    .map((file) => file.slice(srcDir.length).replace(/\\/g, '/'))
}

function sfc(relativePath: string): string {
  return readFileSync(join(srcDir, relativePath), 'utf8')
}

describe('U14/axe contrast guard (grey-placeholder sweep)', () => {
  it('sweeps every .vue file under src/ (guards against an empty sweep)', () => {
    expect(vueFiles.length).toBeGreaterThanOrEqual(30)
  })

  it('no .vue file styles text with var(--gray-400) (axe color-contrast)', () => {
    expect(offenders(grayTokenPattern)).toEqual([])
  })

  it('sweep also catches the fallback form var(--gray-400, …)', () => {
    expect('color: var(--gray-400, #d1d5db);').toMatch(grayTokenPattern)
  })

  it('no .vue file contains the raw #9ca3af literal', () => {
    expect(offenders(/#9ca3af/i)).toEqual([])
  })

  it('.event-detail__description--empty resolves to var(--muted)', () => {
    expect(sfc('views/app/events/EventDetailView.vue')).toMatch(
      /\.event-detail__description--empty\s*\{[^}]*color:\s*var\(--muted\)/,
    )
  })
})
