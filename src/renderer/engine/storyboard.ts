import type { StoryboardPanel } from '@shared/types'

export interface PanelRect {
  x: number
  y: number
  w: number
  h: number
}

export interface BoardLayout {
  width: number
  height: number
  panels: PanelRect[]
  titleY: number
  margin: number
}

export const BOARD_TITLE_H = 64
export const BOARD_PADDING = 48
export const PANEL_GAP = 36
export const PANEL_CAPTION_H = 46
export const PANEL_RATIO = 0.82 // 缩略图高 / 宽

/**
 * 纯布局计算：给定分镜数量与目标宽度，输出每格的矩形。
 * 1~2 格一行，3~4 格两行，5+ 格每行 3 个。
 */
export function layoutBoard(count: number, targetWidth = 1400): BoardLayout {
  let cols = 1
  if (count >= 2) cols = 2
  if (count >= 5) cols = 3
  const rows = Math.max(1, Math.ceil(count / cols))
  const margin = BOARD_PADDING
  const gap = PANEL_GAP
  const panelW = (targetWidth - margin * 2 - gap * (cols - 1)) / cols
  const panelH = panelW * PANEL_RATIO + PANEL_CAPTION_H
  const height = BOARD_TITLE_H + margin + rows * panelH + (rows - 1) * gap + margin

  const panels: PanelRect[] = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    panels.push({
      x: margin + col * (panelW + gap),
      y: BOARD_TITLE_H + margin + row * (panelH + gap),
      w: panelW,
      h: panelH
    })
  }
  return { width: targetWidth, height, panels, titleY: 42, margin }
}

/** 在 canvas 上合成制作分镜，返回 PNG dataURL */
export async function renderStoryboard(
  panels: StoryboardPanel[],
  title: string
): Promise<string> {
  const layout = layoutBoard(panels.length)
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#101319'
  ctx.fillRect(0, 0, layout.width, layout.height)

  ctx.fillStyle = '#e8e4da'
  ctx.font = 'bold 30px sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, layout.margin, layout.titleY)
  ctx.font = '15px sans-serif'
  ctx.fillStyle = '#7d8794'
  ctx.fillText(
    `琉璃工房 · 制作分镜 · ${panels.length} 个工序节点`,
    layout.margin + ctx.measureText(title).width + 24,
    layout.titleY + 2
  )

  const thumbH = (w: number): number => w * PANEL_RATIO
  await Promise.all(
    panels.map(
      (p, i) =>
        new Promise<void>((resolve) => {
          const rect = layout.panels[i]
          const img = new Image()
          img.onload = (): void => {
            ctx.fillStyle = '#171b22'
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
            ctx.drawImage(img, rect.x, rect.y, rect.w, thumbH(rect.w))
            ctx.fillStyle = '#d8d4ca'
            ctx.font = 'bold 17px sans-serif'
            ctx.fillText(`${i + 1}. ${p.title}`, rect.x + 14, rect.y + thumbH(rect.w) + 18)
            ctx.fillStyle = '#8b95a3'
            ctx.font = '14px sans-serif'
            ctx.fillText(p.caption, rect.x + 14, rect.y + thumbH(rect.w) + 36)
            ctx.strokeStyle = 'rgba(255,255,255,0.08)'
            ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1)
            resolve()
          }
          img.onerror = (): void => resolve()
          img.src = p.thumb
        })
    )
  )

  return canvas.toDataURL('image/png')
}
