import { useState } from 'react'
import { useStudio } from '../state/store'
import { drawThumbnail } from '../engine/render'

export function Snapshots(): JSX.Element {
  const snapshots = useStudio((s) => s.snapshots)
  const addSnapshot = useStudio((s) => s.addSnapshot)
  const removeSnapshot = useStudio((s) => s.removeSnapshot)
  const loadSnapshot = useStudio((s) => s.loadSnapshot)
  const replaying = useStudio((s) => s.replaying)
  const [title, setTitle] = useState('')

  const capture = async (): Promise<void> => {
    const s = useStudio.getState()
    const thumb = drawThumbnail(s.engine.glass, s.engine.input, s.metrics)
    const n = snapshots.length + 1
    await addSnapshot(title.trim() || `工序 ${n}`, '', thumb)
    setTitle('')
  }

  return (
    <div className="panel snapshots">
      <h3>过程快照</h3>
      <div className="snap-form">
        <input
          value={title}
          placeholder="节点名称（可选）"
          onChange={(ev) => setTitle(ev.target.value)}
          disabled={replaying}
        />
        <button className="primary" onClick={capture} disabled={replaying}>
          拍快照
        </button>
      </div>
      {snapshots.length === 0 && <p className="muted small">还没有快照，在关键工序节点拍一张。</p>}
      <ul className="snap-list">
        {snapshots.map((meta) => (
          <li key={meta.record.id}>
            <img src={meta.record.thumb} alt={meta.record.title} />
            <div className="snap-info">
              <b>{meta.record.title}</b>
              <span>{new Date(meta.record.created_at).toLocaleTimeString()}</span>
              <div className="snap-actions">
                <button disabled={replaying} onClick={() => loadSnapshot(meta)}>
                  读取
                </button>
                <button
                  className="danger-btn"
                  onClick={() => meta.record.id != null && removeSnapshot(meta.record.id)}
                >
                  删除
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Timeline(): JSX.Element {
  const replaying = useStudio((s) => s.replaying)
  const progress = useStudio((s) => s.replayProgress)
  const playReplay = useStudio((s) => s.playReplay)
  const stopReplay = useStudio((s) => s.stopReplay)
  const resetGlass = useStudio((s) => s.resetGlass)
  const engine = useStudio((s) => s.engine)
  const frames = engine.traj.length

  return (
    <div className="panel timeline">
      <h3>成形轨迹</h3>
      <div className="timeline-btns">
        {!replaying ? (
          <button className="primary" onClick={playReplay} disabled={frames < 2}>
            ▶ 回放轨迹
          </button>
        ) : (
          <button onClick={stopReplay}>■ 停止回放</button>
        )}
        <button onClick={resetGlass} disabled={replaying}>
          ↺ 取新料重来
        </button>
      </div>
      <div className="bar">
        <i style={{ width: `${(replaying ? progress : frames > 0 ? 1 : 0) * 100}%` }} />
      </div>
      <p className="muted small">
        {replaying
          ? `回放中 ${(progress * 100).toFixed(0)}%（从料泡开始逐帧复现）`
          : `已记录 ${frames} 帧（约 ${(frames / 30).toFixed(1)} 秒操作）`}
      </p>
    </div>
  )
}
