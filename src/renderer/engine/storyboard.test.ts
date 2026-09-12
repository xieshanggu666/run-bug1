import { describe, expect, it } from 'vitest'
import { layoutBoard } from './storyboard'

describe('分镜布局', () => {
  it('单格占满一行', () => {
    const l = layoutBoard(1)
    expect(l.panels).toHaveLength(1)
    expect(l.panels[0].x).toBe(48)
  })

  it('2~4 格每行两列', () => {
    for (const n of [2, 3, 4]) {
      const l = layoutBoard(n)
      expect(l.panels[1].x).toBeGreaterThan(l.panels[0].x)
      expect(l.panels[1].y).toBe(l.panels[0].y)
    }
    expect(layoutBoard(3).panels[2].y).toBeGreaterThan(layoutBoard(3).panels[0].y)
  })

  it('5 格以上每行三列', () => {
    const l = layoutBoard(6)
    expect(l.panels[2].y).toBe(l.panels[0].y)
    expect(l.panels[3].y).toBeGreaterThan(l.panels[0].y)
  })

  it('所有格子互不重叠且在画布内', () => {
    const l = layoutBoard(7)
    for (const a of l.panels) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(l.width)
      expect(a.y + a.h).toBeLessThanOrEqual(l.height)
    }
    for (let i = 0; i < l.panels.length; i++) {
      for (let j = i + 1; j < l.panels.length; j++) {
        const a = l.panels[i]
        const b = l.panels[j]
        const overlap = !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
        expect(overlap).toBe(false)
      }
    }
  })
})
