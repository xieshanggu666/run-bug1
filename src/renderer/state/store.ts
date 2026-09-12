import { create } from 'zustand'
import type { SimParams, SnapshotRecord, ToolId } from '@shared/types'
import {
  DEFAULT_INPUT,
  Engine,
  type GlassMetrics
} from '../engine/engine'
import type { GlassSnapshot } from '../engine/geometry'
import {
  deleteSnapshot,
  listSnapshots,
  saveSnapshot
} from './storage'

export interface SnapshotMeta {
  record: SnapshotRecord
  snapshot: GlassSnapshot
}

interface StudioState {
  engine: Engine
  tool: ToolId
  params: SimParams
  /** 每次 tick 自增，用于驱动 React 刷新读数（不存整块玻璃） */
  frameTick: number
  metrics: GlassMetrics
  pointerActive: boolean
  replaying: boolean
  replayProgress: number
  snapshots: SnapshotMeta[]
  toast: string | null
  busy: boolean

  bump: () => void
  setTool: (t: ToolId) => void
  setParam: <K extends keyof SimParams>(k: K, v: SimParams[K]) => void
  setPointerActive: (v: boolean) => void

  refreshSnapshots: () => Promise<void>
  addSnapshot: (title: string, note: string, thumb: string) => Promise<void>
  removeSnapshot: (id: number) => Promise<void>
  loadSnapshot: (meta: SnapshotMeta) => void

  playReplay: () => void
  stopReplay: () => void
  setReplayProgress: (p: number) => void

  resetGlass: () => void
  showToast: (msg: string) => void
  setBusy: (v: boolean) => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useStudio = create<StudioState>((set, get) => {
  const engine = new Engine()

  return {
    engine,
    tool: engine.input.tool,
    params: { ...engine.input.params },
    frameTick: 0,
    metrics: engine.metrics(),
    pointerActive: false,
    replaying: false,
    replayProgress: 0,
    snapshots: [],
    toast: null,
    busy: false,

    bump: () => {
      const { engine: e } = get()
      set({ frameTick: get().frameTick + 1, metrics: e.metrics() })
    },

    setTool: (t) => {
      get().engine.setTool(t)
      set({ tool: t })
    },

    setParam: (k, v) => {
      const p = { ...get().params, [k]: v }
      get().engine.setParams({ [k]: v })
      set({ params: p })
    },

    setPointerActive: (v) => set({ pointerActive: v }),

    refreshSnapshots: async () => {
      const records = await listSnapshots()
      const metas: SnapshotMeta[] = []
      for (const record of records) {
        try {
          metas.push({ record, snapshot: JSON.parse(record.glass_json) as GlassSnapshot })
        } catch {
          // 损坏的记录跳过
        }
      }
      set({ snapshots: metas })
    },

    addSnapshot: async (title, note, thumb) => {
      const { engine: e, showToast, refreshSnapshots } = get()
      const record = await saveSnapshot({
        title,
        note,
        glass_json: JSON.stringify(e.snapshot()),
        thumb
      })
      await refreshSnapshots()
      showToast(`已保存快照「${record.title}」`)
    },

    removeSnapshot: async (id) => {
      await deleteSnapshot(id)
      await get().refreshSnapshots()
    },

    loadSnapshot: (meta) => {
      const { engine: e, stopReplay } = get()
      stopReplay()
      e.restore(meta.snapshot)
      e.clearTraj()
      set({ metrics: e.metrics() })
      get().bump()
      get().showToast(`已读取快照「${meta.record.title}」`)
    },

    playReplay: () => {
      const { engine: e } = get()
      if (e.traj.length < 2) {
        get().showToast('还没有可回放的成形轨迹')
        return
      }
      // reset 会清空轨迹，先留存帧序列
      const frames = e.traj.slice()
      e.reset()
      e.startReplay(frames)
      set({
        replaying: true,
        replayProgress: 0,
        tool: 'flame',
        params: { ...DEFAULT_INPUT.params }
      })
    },

    stopReplay: () => {
      const { engine: e } = get()
      e.cancelReplay()
      set({ replaying: false, replayProgress: 0 })
    },

    setReplayProgress: (p) => set({ replayProgress: p }),

    resetGlass: () => {
      get().engine.reset()
      set({
        tool: 'flame',
        params: { ...DEFAULT_INPUT.params },
        metrics: get().engine.metrics(),
        replaying: false,
        replayProgress: 0
      })
      get().bump()
    },

    showToast: (msg) => {
      set({ toast: msg })
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => set({ toast: null }), 2600)
    },

    setBusy: (v) => set({ busy: v })
  }
})
