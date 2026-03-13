import * as pty from 'node-pty';

// Map of agentId → IPtyProcess
export const ptyProcesses = new Map<string, pty.IPty>();

export function spawnPty(
  agentId: string,
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string>,
  onData: (data: string) => void,
  onExit: (code: number | undefined) => void
): pty.IPty {
  const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';

  const ptyProcess = pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: 220,
    rows: 50,
    cwd,
    env: { ...process.env, ...env } as Record<string, string>,
  });

  ptyProcess.onData(onData);
  ptyProcess.onExit(({ exitCode }) => onExit(exitCode));

  ptyProcesses.set(agentId, ptyProcess);
  return ptyProcess;
}

export function writeToPty(agentId: string, data: string): boolean {
  const proc = ptyProcesses.get(agentId);
  if (!proc) return false;
  proc.write(data);
  return true;
}

export function killPty(agentId: string): void {
  const proc = ptyProcesses.get(agentId);
  if (proc) {
    proc.kill();
    ptyProcesses.delete(agentId);
  }
}

export function resizePty(agentId: string, cols: number, rows: number): void {
  const proc = ptyProcesses.get(agentId);
  if (proc) proc.resize(cols, rows);
}
