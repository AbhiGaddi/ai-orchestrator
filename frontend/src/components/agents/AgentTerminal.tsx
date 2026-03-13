import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
    PlaySquare, DollarSign, Database, Trash2, Cpu, FileText,
    CornerDownRight, Server, Brain, Wrench, CheckCircle2,
    FileEdit, Search, Terminal as TerminalIcon, Code2,
    Loader2, AlertCircle, FolderOpen, Globe,
    MessageSquare, List, Zap, Bot, ShieldAlert, ShieldCheck, ShieldX
} from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { ipc } from '@/lib/ipc';

const PERMISSION_PATTERNS = [
    /permission.*needed/i,
    /grant.*permission/i,
    /write permission/i,
    /needs.*permission/i,
    /please.*grant/i,
    /allow.*this.*action/i,
    /do you want to/i,
    /would you like to/i,
];

interface SessionState {
    model: string;
    turnCount: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    currentTool?: string;
}

interface ActivityStep {
    id: string;
    type: 'thinking' | 'tool' | 'text' | 'done' | 'error' | 'start' | 'permission';
    label: string;
    detail?: string;
    status: 'running' | 'done' | 'error';
    timestamp: number;
    answered?: boolean;
}

const COST_PER_M = {
    sonnet: { in: 3, out: 15 },
    opus: { in: 15, out: 75 },
    haiku: { in: 0.25, out: 1.25 },
};

function modelRate(model: string) {
    if (model.includes('opus')) return COST_PER_M.opus;
    if (model.includes('haiku')) return COST_PER_M.haiku;
    return COST_PER_M.sonnet;
}

function getToolIcon(toolName: string) {
    const n = (toolName ?? '').toLowerCase();
    if (n === 'write') return <FileEdit size={13} className="text-emerald-400" />;
    if (n === 'edit') return <FileEdit size={13} className="text-yellow-400" />;
    if (n === 'read') return <FileText size={13} className="text-sky-400" />;
    if (n === 'bash') return <TerminalIcon size={13} className="text-orange-400" />;
    if (n === 'glob') return <FolderOpen size={13} className="text-violet-400" />;
    if (n === 'grep') return <Search size={13} className="text-pink-400" />;
    if (n === 'webfetch' || n === 'websearch') return <Globe size={13} className="text-blue-400" />;
    if (n === 'agent') return <Zap size={13} className="text-amber-400" />;
    return <Wrench size={13} className="text-gray-400" />;
}

function getToolLabel(toolName: string, input: Record<string, unknown>): { label: string; detail?: string } {
    const n = (toolName ?? '').toLowerCase();
    const shortPath = (p: unknown) => String(p ?? '').split('/').pop() || String(p ?? '');
    if (n === 'write') return { label: 'Creating file', detail: shortPath(input?.file_path ?? input?.path) };
    if (n === 'edit') return { label: 'Editing file', detail: shortPath(input?.file_path ?? input?.path) };
    if (n === 'read') return { label: 'Reading file', detail: shortPath(input?.file_path ?? input?.path) };
    if (n === 'bash') return { label: 'Running command', detail: String(input?.command ?? input?.cmd ?? '').slice(0, 60) };
    if (n === 'glob') return { label: 'Searching files', detail: String(input?.pattern ?? '') };
    if (n === 'grep') return { label: 'Searching code', detail: String(input?.pattern ?? '') };
    if (n === 'webfetch') return { label: 'Fetching URL', detail: String(input?.url ?? '').slice(0, 60) };
    if (n === 'websearch') return { label: 'Searching web', detail: String(input?.query ?? '') };
    if (n === 'agent') return { label: 'Spawning sub-agent', detail: String(input?.description ?? '').slice(0, 60) };
    return { label: `Using ${toolName}` };
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgentTerminal({ agentId }: { readonly agentId: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<'activity' | 'raw'>('activity');
    const [view, setView] = useState<'activity' | 'raw'>('activity');
    const [customCommand, setCustomCommand] = useState('');
    const [steps, setSteps] = useState<ActivityStep[]>([]);
    const [permissionPending, setPermissionPending] = useState(false);
    const [session, setSession] = useState<SessionState>({
        model: 'Unknown',
        turnCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
    });

    const stepIdRef = useRef(0);

    const upsertStep = useCallback((
        type: ActivityStep['type'],
        label: string,
        detail?: string,
        status: ActivityStep['status'] = 'running'
    ) => {
        setSteps(prev => {
            // Find if we have a "running" step of the same type or consecutive identical steps
            const last = prev[prev.length - 1];

            // If the last step is identical in label and detail, just update its status if needed
            if (last && last.label === label && last.detail === detail) {
                if (last.status === status) return prev;
                const next = [...prev];
                next[next.length - 1] = { ...last, status };
                return next;
            }

            // If we have a running step of same type, maybe replace it? 
            // For tools, we usually want to mark the old one as done and start new one, 
            // but for 'thinking' or 'text', we might want to append.
            if (last && last.status === 'running' && last.type === type) {
                const next = [...prev];
                next[next.length - 1] = { ...last, label, detail, status };
                return next;
            }

            // Otherwise add new
            return [...prev, {
                id: String(++stepIdRef.current),
                type, label, detail, status, timestamp: Date.now(),
            }];
        });
    }, []);

    // Auto-scroll activity log on new steps
    useEffect(() => {
        if (view === 'activity' && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [steps, view]);

    // xterm raw terminal setup
    useEffect(() => {
        if (view !== 'raw' || !containerRef.current || !agentId) return;

        const term = new Terminal({
            theme: { background: '#09090b', foreground: '#e5e7eb', cursor: '#a855f7' },
            cursorBlink: true,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(containerRef.current);
        const tid = setTimeout(() => fitAddon.fit(), 50);
        termRef.current = term;

        ipc.agents.getOutput(agentId).then(chunks => {
            chunks.forEach(c => term.write(c));
        });

        const inputSub = term.onData(d => ipc.agents.sendInput(agentId, d));
        const onResize = () => fitAddon.fit();
        window.addEventListener('resize', onResize);

        return () => {
            clearTimeout(tid);
            inputSub.dispose();
            window.removeEventListener('resize', onResize);
            term.dispose();
            termRef.current = null;
        };
    }, [agentId, view]);

    // Activity log: process Claude CLI stream-json events
    useEffect(() => {
        if (!agentId) return;

        /**
         * Claude CLI --output-format stream-json emits one JSON object per line:
         *   {"type":"system","subtype":"init",...}
         *   {"type":"assistant","message":{"content":[...],"usage":{...},"model":"...",...},...}
         *   {"type":"user","message":{"content":[{"type":"tool_result",...}]},...}
         *   {"type":"result","subtype":"success","total_cost_usd":...,"num_turns":...}
         */
        const processEvent = (event: Record<string, unknown>) => {
            const type = event.type as string;

            if (type === 'system' && event.subtype === 'init') {
                upsertStep('start', 'Agent session started', undefined, 'done');
                return;
            }

            if (type === 'assistant') {
                const msg = (event.message ?? {}) as Record<string, unknown>;
                const model = msg.model as string | undefined;
                const usage = msg.usage as Record<string, number> | undefined;

                setSession(prev => {
                    const next = { ...prev };
                    if (model) next.model = model;
                    if (usage) {
                        next.turnCount += 1;
                        next.inputTokens += usage.input_tokens ?? 0;
                        next.outputTokens += usage.output_tokens ?? 0;
                        const rate = modelRate(model ?? prev.model);
                        next.estimatedCost = (next.inputTokens / 1_000_000) * rate.in + (next.outputTokens / 1_000_000) * rate.out;
                    }
                    return next;
                });

                const content = (msg.content as Record<string, unknown>[]) ?? [];
                for (const block of content) {
                    if (block.type === 'thinking') {
                        const thought = String(block.thinking ?? '').trim();
                        if (thought) upsertStep('thinking', 'Thinking', thought.slice(0, 100) + (thought.length > 100 ? '...' : ''), 'done');
                    }
                    if (block.type === 'tool_use') {
                        const toolName = String(block.name ?? '');
                        const input = (block.input ?? {}) as Record<string, unknown>;
                        const { label, detail } = getToolLabel(toolName, input);
                        upsertStep('tool', label, detail, 'running');
                        setSession(prev => ({ ...prev, currentTool: toolName }));
                    }
                    if (block.type === 'text') {
                        const text = String(block.text ?? '').trim();
                        if (!text) break;
                        const isPermission = PERMISSION_PATTERNS.some(p => p.test(text));
                        if (isPermission) {
                            setSteps(prev => {
                                if (prev.some(s => s.type === 'permission' && !s.answered)) return prev;
                                return [...prev, {
                                    id: String(++stepIdRef.current),
                                    type: 'permission' as const,
                                    label: 'Permission Required',
                                    detail: text,
                                    status: 'running' as const,
                                    timestamp: Date.now(),
                                    answered: false,
                                }];
                            });
                        } else {
                            // Store full text — UI handles display
                            upsertStep('text', 'Responding', text, 'done');
                        }
                    }
                }
                return;
            }

            if (type === 'user') {
                setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const } : s));
                setSession(prev => ({ ...prev, currentTool: undefined }));
                return;
            }

            if (type === 'result') {
                const isError = event.is_error as boolean;
                const subtype = event.subtype as string;
                const success = !isError && subtype === 'success';
                const cost = event.total_cost_usd as number | undefined;

                setSteps(prev => [
                    ...prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const } : s),
                ]);
                upsertStep(
                    success ? 'done' : 'error',
                    success ? 'Task completed successfully' : 'Task failed',
                    undefined,
                    success ? 'done' : 'error'
                );
                if (cost != null) setSession(prev => ({ ...prev, estimatedCost: cost }));
                return;
            }

            // Diagnostic: show the exact command and CWD being used
            if (type === 'diagnostic') {
                const cwd = event.cwd as string;
                const command = event.command as string;
                upsertStep('start', `CWD: ${cwd}`, command, 'done');
                return;
            }

            // Tool error: a tool call (Write/Bash/etc.) returned an error
            if (type === 'tool_error') {
                upsertStep('error', 'Tool call failed', event.message as string, 'error');
                return;
            }

            // Result text: Claude's final response text
            if (type === 'result_text') {
                const isErr = event.is_error as boolean;
                upsertStep(
                    isErr ? 'error' : 'text',
                    isErr ? 'Agent response (error)' : 'Final response',
                    event.text as string,
                    isErr ? 'error' : 'done'
                );
                return;
            }
        };

        // Handle agent:output — the backend emits this for non-JSON lines.
        // But we also try to parse JSON in case the backend config changed.
        const handleOutput = (payload: unknown) => {
            const { id, data } = payload as { id: string; data: string };
            if (id !== agentId) return;

            // Try parsing each line as a CLI event
            for (const line of data.split('\n')) {
                const t = line.trim();
                if (t.startsWith('{') && t.endsWith('}')) {
                    try { processEvent(JSON.parse(t) as Record<string, unknown>); } catch { /* skip */ }
                }
            }

            // Also forward to raw terminal if visible
            if (viewRef.current === 'raw' && termRef.current) {
                termRef.current.write(data);
            }
        };

        // Handle agent:stream-event — backend emits this for every parsed JSON line
        const handleStreamEvent = (payload: unknown) => {
            const { id, event } = payload as { id: string; event: Record<string, unknown> };
            if (id !== agentId) return;
            processEvent(event);
        };

        // Replay historical output for activity log
        ipc.agents.getOutput(agentId).then(chunks => {
            const fullText = chunks.join('');
            for (const line of fullText.split('\n')) {
                const t = line.trim();
                if (t.startsWith('{') && t.endsWith('}')) {
                    try { processEvent(JSON.parse(t) as Record<string, unknown>); } catch { /* skip */ }
                }
            }
        });

        // Handle permission-request from main process (Electron notification fallback)
        const handlePermissionRequest = (payload: unknown) => {
            const { id, message } = payload as { id: string; message: string };
            if (id !== agentId) return;
            setPermissionPending(true);
            setSteps(prev => {
                if (prev.some(s => s.type === 'permission' && !s.answered)) return prev;
                return [...prev, {
                    id: String(++stepIdRef.current),
                    type: 'permission' as const,
                    label: 'Permission Required',
                    detail: message,
                    status: 'running' as const,
                    timestamp: Date.now(),
                    answered: false,
                }];
            });
        };

        ipc.on('agent:output', handleOutput);
        ipc.on('agent:stream-event', handleStreamEvent);
        ipc.on('agent:permission-request', handlePermissionRequest);

        return () => {
            ipc.off('agent:output', handleOutput);
            ipc.off('agent:stream-event', handleStreamEvent);
            ipc.off('agent:permission-request', handlePermissionRequest);
        };
    }, [agentId, upsertStep]);

    const sendCmd = (cmd: string) => ipc.agents.sendInput(agentId, cmd + '\n');

    const answerPermission = (stepId: string, allow: boolean) => {
        ipc.agents.sendInput(agentId, allow ? 'y\n' : 'n\n');
        setPermissionPending(false);
        setSteps(prev => prev.map(s =>
            s.id === stepId
                ? { ...s, answered: true, status: allow ? 'done' : 'error', label: allow ? 'Permission Granted' : 'Permission Denied' }
                : s
        ));
    };

    const switchView = (v: 'activity' | 'raw') => {
        viewRef.current = v;
        setView(v);
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#09090b] rounded-lg border border-[#374151] overflow-hidden">

            {/* Top toolbar */}
            <div className="flex flex-col border-b border-[#1f2937]">
                <div className="flex flex-col gap-2 p-3 bg-[#0f172a]">
                    <div className="flex items-center justify-between">
                        {/* View toggle */}
                        <div className="flex bg-[#1e293b] rounded-lg border border-[#334155] p-1 flex-shrink-0">
                            <button
                                onClick={() => switchView('activity')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${view === 'activity' ? 'bg-violet-600 text-white shadow-violet-500/20' : 'text-gray-400 hover:text-white'}`}
                            >
                                <List size={14} /> Activity Log
                            </button>
                            <button
                                onClick={() => switchView('raw')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${view === 'raw' ? 'bg-violet-600 text-white shadow-violet-500/20' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Code2 size={14} /> Terminal
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => sendCmd('/clear')} className="p-2 rounded-lg bg-[#1e293b] border border-[#334155] text-gray-300 hover:text-white hover:border-gray-400 transition-all" title="Clear"><Trash2 size={14} /></button>
                            <button onClick={() => sendCmd('/mcp')} className="p-2 rounded-lg bg-[#1e293b] border border-[#334155] text-gray-300 hover:text-white hover:border-gray-400 transition-all" title="MCP Status"><Server size={14} /></button>
                            <button onClick={() => sendCmd('/memory')} className="p-2 rounded-lg bg-[#1e293b] border border-[#334155] text-gray-300 hover:text-white hover:border-gray-400 transition-all" title="Memory"><Database size={14} /></button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                        <button onClick={() => sendCmd('/compact')} className="px-2.5 py-1 rounded bg-[#1e293b]/50 border border-[#334155]/50 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-violet-400 hover:border-violet-400/50 transition-all whitespace-nowrap">Compact</button>
                        <button onClick={() => sendCmd('/cost')} className="px-2.5 py-1 rounded bg-[#1e293b]/50 border border-[#334155]/50 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-violet-400 hover:border-violet-400/50 transition-all whitespace-nowrap">Cost</button>
                        <button onClick={() => sendCmd('/stats')} className="px-2.5 py-1 rounded bg-[#1e293b]/50 border border-[#334155]/50 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-violet-400 hover:border-violet-400/50 transition-all whitespace-nowrap">Stats</button>
                        <button onClick={() => sendCmd('/review')} className="px-2.5 py-1 rounded bg-[#1e293b]/50 border border-[#334155]/50 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-violet-400 hover:border-violet-400/50 transition-all whitespace-nowrap">Review</button>

                        <div className="bg-[#1e293b] rounded-lg flex items-center px-3 py-1.5 flex-1 min-w-[200px] border border-[#334155] focus-within:border-violet-500/50 transition-all">
                            <CornerDownRight size={13} className="text-gray-400 mr-2" />
                            <input
                                className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-gray-500"
                                placeholder="Enter command or follow-up instruction..."
                                value={customCommand}
                                onChange={e => setCustomCommand(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') { sendCmd(customCommand); setCustomCommand(''); }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Session stats */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#020617] text-[11px] font-mono border-t border-[#1e293b]">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2 text-gray-300">
                            <Cpu size={12} className="text-violet-500" />
                            <span className="text-white">{session.model}</span>
                        </span>
                        <span className="text-gray-300">Turns: <span className="text-violet-400 font-bold">{session.turnCount}</span></span>
                        <span className="text-gray-300" title={`${session.inputTokens} in / ${session.outputTokens} out`}>
                            Tokens: <span className="text-blue-400 font-bold">{(session.inputTokens + session.outputTokens).toLocaleString()}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        {session.currentTool && (
                            <span className="flex items-center gap-2 px-2 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/20 text-yellow-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                <Zap size={10} /> Active: {session.currentTool}
                            </span>
                        )}
                        <span className="flex items-center gap-1 text-gray-300">
                            Cost: <span className="text-emerald-400 font-bold">${session.estimatedCost.toFixed(4)}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative overflow-hidden">

                {/* Activity log */}
                {view === 'activity' && (
                    <div
                        ref={scrollRef}
                        className="absolute inset-0 overflow-y-auto p-3 flex flex-col gap-0.5"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}
                    >
                        {steps.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                                <Bot size={36} className="opacity-20" />
                                <p className="text-sm">Waiting for agent to start...</p>
                                <p className="text-xs opacity-60">Click the ▶ play button on an agent card to begin</p>
                            </div>
                        ) : (
                            <>
                                {steps.map((step, i) => (
                                    step.type === 'permission' && !step.answered
                                        ? <PermissionRow key={step.id} step={step} onAnswer={answerPermission} />
                                        : <StepRow key={step.id} step={step} isLast={i === steps.length - 1} />
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* Raw terminal */}
                {view === 'raw' && (
                    <div ref={containerRef} className="absolute inset-0 p-2" />
                )}
            </div>
        </div>
    );
}

// ── Permission row ────────────────────────────────────────────────────────────

function PermissionRow({ step, onAnswer }: {
    step: ActivityStep;
    onAnswer: (stepId: string, allow: boolean) => void;
}) {
    return (
        <div className="mx-1 my-2 rounded-xl border border-amber-500/40 bg-amber-500/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-500/20 bg-amber-500/10">
                <ShieldAlert size={16} className="text-amber-400 flex-shrink-0" />
                <span className="text-sm font-bold text-amber-400">Permission Required</span>
                <span className="ml-auto flex gap-1">
                    {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: `${d}ms` }} />
                    ))}
                </span>
            </div>

            {/* Message */}
            <div className="px-4 py-3">
                <p className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                    {step.detail}
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-3">
                <button
                    onClick={() => onAnswer(step.id, true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all"
                >
                    <ShieldCheck size={13} /> Allow
                </button>
                <button
                    onClick={() => onAnswer(step.id, false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all"
                >
                    <ShieldX size={13} /> Deny
                </button>
            </div>
        </div>
    );
}

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({ step, isLast }: { step: ActivityStep; isLast: boolean }) {
    const running = step.status === 'running';

    const icon = (() => {
        if (step.type === 'permission') return step.status === 'done'
            ? <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            : <ShieldX size={14} className="text-red-400 flex-shrink-0 mt-0.5" />;
        if (step.status === 'error') return <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />;
        if (step.type === 'done') return <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />;
        if (step.type === 'start') return <Bot size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />;
        if (step.type === 'thinking') {
            return running
                ? <Loader2 size={14} className="text-violet-400 animate-spin flex-shrink-0 mt-0.5" />
                : <Brain size={14} className="text-violet-400/60 flex-shrink-0 mt-0.5" />;
        }
        if (step.type === 'tool') {
            return running
                ? <Loader2 size={14} className="text-yellow-400 animate-spin flex-shrink-0 mt-0.5" />
                : getToolIcon(step.label);
        }
        if (step.type === 'text') {
            return running
                ? <Loader2 size={14} className="text-sky-400 animate-spin flex-shrink-0 mt-0.5" />
                : <MessageSquare size={14} className="text-sky-400/60 flex-shrink-0 mt-0.5" />;
        }
        return <MessageSquare size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />;
    })();

    const labelCls = (() => {
        if (step.status === 'error') return 'text-red-400 font-bold';
        if (step.type === 'done') return 'text-emerald-400 font-bold';
        if (step.type === 'start') return 'text-violet-400 font-semibold italic';
        if (step.type === 'thinking') return running ? 'text-violet-200' : 'text-gray-400 italic';
        if (step.type === 'tool') return running ? 'text-yellow-400 font-bold' : 'text-white font-semibold';
        if (step.type === 'text') return 'text-sky-400 font-medium';
        return 'text-gray-300';
    })();

    // For completed tool rows, show the actual tool icon alongside the step icon
    const showToolIcon = step.type === 'tool' && !running;
    const toolIconEl = showToolIcon ? (() => {
        const toolMap: Record<string, string> = {
            'Creating file': 'Write', 'Editing file': 'Edit', 'Reading file': 'Read',
            'Running command': 'Bash', 'Searching files': 'Glob', 'Searching code': 'Grep',
            'Fetching URL': 'WebFetch', 'Searching web': 'WebSearch', 'Spawning sub-agent': 'Agent',
        };
        return getToolIcon(toolMap[step.label] ?? step.label);
    })() : null;

    return (
        <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all border ${running ? 'bg-violet-600/5 border-violet-500/30' : 'hover:bg-slate-800/40 border-transparent'}`}>
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-800/50 border border-slate-700/50 flex-shrink-0 mt-0.5">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-sm tracking-tight ${labelCls}`}>{step.label}</span>
                    {showToolIcon && <span className="opacity-80 scale-90">{toolIconEl}</span>}
                </div>
                {step.detail && (
                    step.type === 'text' ? (
                        // Responding steps: show full text in a readable block
                        <div className="mt-2 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap break-words bg-[#0d1117] border border-[#1f2937] rounded-lg px-3 py-2.5 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
                            {step.detail}
                        </div>
                    ) : (
                        // Tool/thinking steps: single line with tooltip for overflow
                        <div className="mt-1 text-xs text-gray-400 font-mono truncate leading-relaxed opacity-80" title={step.detail}>
                            {step.detail}
                        </div>
                    )
                )}
            </div>
            {running && isLast && (
                <div className="flex gap-1 mt-2.5 flex-shrink-0">
                    {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: `${d}ms` }} />
                    ))}
                </div>
            )}
        </div>
    );
}
