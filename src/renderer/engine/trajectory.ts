import type { FrameInput, SimParams, ToolId, TrajFrame } from '@shared/types'

/**
 * 轨迹文件（JSON）的序列化与严格校验。
 * 纯函数、无 DOM 依赖，导入解析失败时抛出带中文说明的 TrajectoryParseError。
 */

export const TRAJ_FILE_KIND = 'glass-forge-trajectory'
export const TRAJ_FILE_VERSION = 1

/** 轨迹文件损坏 / 格式不符时抛出，message 面向用户 */
export class TrajectoryParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TrajectoryParseError'
  }
}

interface TrajectoryFile {
  kind: typeof TRAJ_FILE_KIND
  version: number
  frames: TrajFrame[]
}

const TOOL_IDS: readonly ToolId[] = ['flame', 'blow', 'pull', 'marver', 'cool']

export function serializeTrajectory(frames: TrajFrame[]): string {
  const file: TrajectoryFile = { kind: TRAJ_FILE_KIND, version: TRAJ_FILE_VERSION, frames }
  return JSON.stringify(file)
}

/** 解析并校验轨迹文件；返回规范化后的全新帧对象（不引用文件里的数据） */
export function parseTrajectory(text: string): TrajFrame[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new TrajectoryParseError('文件不是有效的 JSON，可能已损坏或被截断')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new TrajectoryParseError('文件内容不是轨迹对象，可能已损坏')
  }
  const file = data as Record<string, unknown>
  if (file.kind !== TRAJ_FILE_KIND) {
    throw new TrajectoryParseError('这不是琉璃工房的轨迹文件（缺少 kind 标记）')
  }
  if (typeof file.version !== 'number') {
    throw new TrajectoryParseError('轨迹文件缺少版本号，可能已损坏')
  }
  if (file.version > TRAJ_FILE_VERSION) {
    throw new TrajectoryParseError(
      `轨迹文件版本（v${file.version}）高于当前应用支持的 v${TRAJ_FILE_VERSION}，请升级应用`
    )
  }
  if (!Array.isArray(file.frames)) {
    throw new TrajectoryParseError('轨迹文件缺少帧数据（frames），可能已损坏')
  }
  if (file.frames.length === 0) {
    throw new TrajectoryParseError('轨迹文件不含任何帧，无法回放')
  }
  return file.frames.map((f, i) => validateFrame(f, i))
}

function validateFrame(raw: unknown, index: number): TrajFrame {
  const where = `第 ${index + 1} 帧`
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TrajectoryParseError(`${where}数据损坏：不是帧对象`)
  }
  const f = raw as Record<string, unknown>
  if (typeof f.dt !== 'number' || !Number.isFinite(f.dt) || f.dt <= 0) {
    throw new TrajectoryParseError(`${where}数据损坏：步长 dt 无效`)
  }
  if (typeof f.input !== 'object' || f.input === null || Array.isArray(f.input)) {
    throw new TrajectoryParseError(`${where}数据损坏：缺少输入 input`)
  }
  const input = f.input as Record<string, unknown>
  if (!TOOL_IDS.includes(input.tool as ToolId)) {
    throw new TrajectoryParseError(`${where}数据损坏：未知工具「${String(input.tool)}」`)
  }
  for (const key of ['x', 'y', 'pressure'] as const) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key] as number)) {
      throw new TrajectoryParseError(`${where}数据损坏：${key} 不是有效数值`)
    }
  }
  if (typeof input.params !== 'object' || input.params === null || Array.isArray(input.params)) {
    throw new TrajectoryParseError(`${where}数据损坏：缺少旋钮参数 params`)
  }
  const params = input.params as Record<string, unknown>
  for (const key of ['temperature', 'spin', 'pullForce', 'blowPressure'] as const) {
    if (typeof params[key] !== 'number' || !Number.isFinite(params[key] as number)) {
      throw new TrajectoryParseError(`${where}数据损坏：参数 ${key} 不是有效数值`)
    }
  }
  // 重新组装，丢弃多余字段，保证进入引擎的是干净数据
  const cleanParams: SimParams = {
    temperature: params.temperature as number,
    spin: params.spin as number,
    pullForce: params.pullForce as number,
    blowPressure: params.blowPressure as number
  }
  const cleanInput: FrameInput = {
    tool: input.tool as ToolId,
    x: input.x as number,
    y: input.y as number,
    pressure: input.pressure as number,
    params: cleanParams
  }
  return { dt: f.dt, input: cleanInput }
}
