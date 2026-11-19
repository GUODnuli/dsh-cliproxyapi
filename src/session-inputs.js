import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { zstdDecompressSync } from 'node:zlib';

// Each append stores its own zstd frame; the runtime decompressor reads only the
// first, so walk the frame magic to recover the whole recording.
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

/** Decode every concatenated zstd frame in one session recording. */
export function decodeFrames(buffer) {
  const starts = [];
  for (let index = buffer.indexOf(MAGIC); index >= 0; index = buffer.indexOf(MAGIC, index + 4)) starts.push(index);
  if (!starts.length) return '';
  let text = '';
  for (let index = 0; index < starts.length; index += 1) {
    try { text += zstdDecompressSync(buffer.subarray(starts[index], starts[index + 1] ?? buffer.length)).toString('utf8'); }
    catch { /* a frame cut by the next magic is not a readable event block */ }
  }
  return text;
}

/** Model-visible inputs one recorded Session sent: its system text and tools. */
export function inputsFromEvents(rows) {
  let system = '', tools = [];
  for (const row of rows) {
    const data = row?.data ?? {};
    if (!system && row?.type === 'system/message') {
      system = (data.message?.content ?? []).filter(part => part?.type === 'text').map(part => part.text).join('\n');
    }
    if (!tools.length && row?.type === 'request/header') {
      tools = (data.header?.tools ?? []).map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters }));
    }
    if (system && tools.length) break;
  }
  return { system, tools };
}

/**
 * Read one recording by Session id.
 * @param sessionId - recorded Session id.
 * @param home - DSH home directory.
 * @returns its system text and tool definitions.
 */
export async function sessionInputsById(sessionId, home = process.env.DSH_HOME || join(homedir(), '.dsh')) {
  if (!/^session-[A-Za-z0-9-]{8,80}$/.test(sessionId)) throw new Error('会话 ID 格式不正确。');
  const root = join(home, 'sessions');
  for (const workspace of await readdir(root).catch(() => [])) {
    const file = join(root, workspace, sessionId, 'session.v4.jsonl.zstd');
    let buffer;
    try { buffer = await readFile(file); } catch { continue; }
    return inputsFromEvents(parseLines(decodeFrames(buffer)));
  }
  throw new Error('没有找到该会话的本地记录。');
}

/**
 * Read the newest recording that carried both a system message and tools. This
 * keeps a probe usable from a fresh conversation that has not sent a request.
 * @param options - DSH home and how many recent recordings to inspect.
 * @returns the system text and tool definitions of that recording.
 */
export async function newestSessionInputs({ home = process.env.DSH_HOME || join(homedir(), '.dsh'), limit = 40 } = {}) {
  const root = join(home, 'sessions');
  const files = [];
  for (const workspace of await readdir(root).catch(() => [])) {
    const dir = join(root, workspace);
    for (const id of await readdir(dir).catch(() => [])) {
      const file = join(dir, id, 'session.v4.jsonl.zstd');
      try { files.push({ file, mtime: (await stat(file)).mtimeMs }); } catch { /* not a session directory */ }
    }
  }
  files.sort((left, right) => right.mtime - left.mtime);
  for (const { file } of files.slice(0, limit)) {
    let buffer;
    try { buffer = await readFile(file); } catch { continue; }
    const inputs = inputsFromEvents(parseLines(decodeFrames(buffer)));
    if (inputs.system && inputs.tools.length) return inputs;
  }
  throw new Error('没有找到同时包含 system 与工具定义的会话记录。');
}

function parseLines(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* a truncated tail line is ignored */ }
  }
  return rows;
}
