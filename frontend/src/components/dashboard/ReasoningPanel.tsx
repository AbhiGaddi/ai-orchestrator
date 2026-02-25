'use client';
import { useState } from 'react';
import { AgentRunStep } from '@/types';
import { ChevronDown, ChevronRight, Brain, Wrench, Terminal, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const toolColors: Record<string, string> = {
    search_codebase: '#6366f1',
    apply_code_and_pr: '#10b981',
    run_linter: '#f59e0b',
    run_tests: '#3b82f6',
};

function StepStatusIcon({ status }: { status: string }) {
    if (status === 'COMPLETED') return <CheckCircle2 size={13} color="var(--green)" />;
    if (status === 'RUNNING') return <Loader2 size={13} color="var(--purple)" style={{ animation: 'spin 1s linear infinite' }} />;
    if (status === 'FAILED') return <AlertCircle size={13} color="var(--red)" />;
    return <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'var(--border)' }} />;
}

function ReasoningStep({ step, index }: { step: AgentRunStep; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const toolColor = step.tool_called ? (toolColors[step.tool_called] ?? '#94a3b8') : '#94a3b8';
    const isFinalAnswer = !step.tool_called;

    return (
        <div style={{
            border: `1px solid ${isFinalAnswer ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
            borderRadius: 8,
            background: isFinalAnswer ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)',
            overflow: 'hidden',
            transition: 'border-color 0.2s',
        }}>
            {/* Step Header */}
            <div
                onClick={() => setExpanded(e => !e)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    userSelect: 'none',
                }}
            >
                {/* Step number */}
                <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: `${toolColor}20`,
                    border: `1px solid ${toolColor}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: toolColor,
                    flexShrink: 0,
                }}>
                    {index + 1}
                </div>

                {/* Status icon */}
                <StepStatusIcon status={step.status} />

                {/* Type badge */}
                {isFinalAnswer ? (
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'var(--green)',
                        background: 'rgba(16,185,129,0.12)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 4,
                        padding: '2px 7px',
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                    }}>
                        ✓ Final Answer
                    </span>
                ) : (
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: toolColor,
                        background: `${toolColor}15`,
                        border: `1px solid ${toolColor}30`,
                        borderRadius: 4,
                        padding: '2px 7px',
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0,
                    }}>
                        <Wrench size={10} />
                        {step.tool_called}
                    </span>
                )}

                {/* Thought preview */}
                <span style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                }}>
                    {step.thought ?? '—'}
                </span>

                {/* Token usage */}
                {(step.prompt_tokens > 0 || step.completion_tokens > 0) && (
                    <span style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        flexShrink: 0,
                    }}>
                        {step.prompt_tokens + step.completion_tokens} tk
                    </span>
                )}

                {/* Chevron */}
                {expanded
                    ? <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    : <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                }
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}>
                    {/* Thought */}
                    {step.thought && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                <Brain size={12} color="var(--accent-light)" />
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    AI Reasoning
                                </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                                &ldquo;{step.thought}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Tool input */}
                    {step.tool_input && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                <Wrench size={12} color={toolColor} />
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: toolColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Tool Input
                                </span>
                            </div>
                            <pre style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                background: 'var(--bg-base)',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                padding: '8px 10px',
                                overflow: 'auto',
                                maxHeight: 120,
                                margin: 0,
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {JSON.stringify(step.tool_input, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Tool output */}
                    {step.tool_output && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                <Terminal size={12} color="var(--green)" />
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Tool Output
                                </span>
                            </div>
                            <pre style={{
                                fontSize: '0.72rem',
                                color: '#a3e635',
                                background: '#0a1a0a',
                                border: '1px solid rgba(74,222,128,0.15)',
                                borderRadius: 6,
                                padding: '8px 10px',
                                overflow: 'auto',
                                maxHeight: 200,
                                margin: 0,
                                fontFamily: 'var(--font-mono)',
                                lineHeight: 1.6,
                            }}>
                                {step.tool_output}
                            </pre>
                        </div>
                    )}

                    {/* Token breakdown */}
                    <div style={{
                        display: 'flex',
                        gap: 12,
                        paddingTop: 4,
                        borderTop: '1px solid var(--border)',
                    }}>
                        {[
                            { label: 'Prompt tokens', value: step.prompt_tokens },
                            { label: 'Completion tokens', value: step.completion_tokens },
                            { label: 'Total', value: step.prompt_tokens + step.completion_tokens },
                        ].map(t => (
                            <div key={t.label}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 1 }}>{t.label}</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                    {t.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ReasoningPanel({ steps, loading }: { steps: AgentRunStep[]; loading: boolean }) {
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map(i => (
                    <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
                ))}
            </div>
        );
    }

    if (steps.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                border: '1px dashed var(--border)',
                borderRadius: 8,
            }}>
                <Brain size={20} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div>No reasoning steps recorded.</div>
                <div style={{ marginTop: 4, fontSize: '0.72rem' }}>Steps will appear here once the agent uses the new ReAct loop.</div>
            </div>
        );
    }

    const totalTokens = steps.reduce((acc, s) => acc + s.prompt_tokens + s.completion_tokens, 0);

    return (
        <div>
            {/* Header summary */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Brain size={14} color="var(--accent-light)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {steps.length} Reasoning Step{steps.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {totalTokens > 0 && (
                    <span style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '2px 7px',
                    }}>
                        {totalTokens.toLocaleString()} total tokens
                    </span>
                )}
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {steps.map((step, i) => (
                    <ReasoningStep key={step.id} step={step} index={i} />
                ))}
            </div>
        </div>
    );
}
