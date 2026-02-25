'use client';
import { X, Github, Mail, Zap, ArrowRight } from 'lucide-react';

interface ApprovalInfoModalProps {
    onClose: () => void;
    onConfirm: () => void;
}

export default function ApprovalInfoModal({ onClose, onConfirm }: ApprovalInfoModalProps) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Zap size={20} color="var(--accent)" /> Pipeline Overview
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                            Approving this task triggers the following automated workflow.
                        </p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
                </div>

                <div className="modal-body" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Step 1 */}
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10, background: 'rgba(168,85,247,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                border: '1px solid rgba(168,85,247,0.2)'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--accent)' }}>1</span>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Github size={14} color="var(--accent)" /> TicketAgent
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    Creates a **GitHub Issue** for project tracking.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10, background: 'rgba(59,130,246,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                border: '1px solid rgba(59,130,246,0.2)'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--blue)' }}>2</span>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Mail size={14} color="var(--blue)" /> EmailAgent
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    Notifies **stakeholders** via email.
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10, background: 'rgba(16,185,129,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                border: '1px solid rgba(16,185,129,0.2)'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--green)' }}>3</span>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Zap size={14} color="var(--green)" /> CodeAgent
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    Generates code and opens a **Pull Request**.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        marginTop: 24, padding: 12, borderRadius: 12, border: '1px solid var(--border)',
                        background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 10
                    }}>
                        <div style={{ fontSize: '1rem opacity: 0.5' }}>💡</div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                            Monitor live progress on the task card.
                        </p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} style={{ borderRadius: 10 }}>Dismiss</button>
                    <button className="btn btn-primary" onClick={onConfirm} style={{
                        borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--blue))',
                        padding: '0 24px', height: 40, fontWeight: 800
                    }}>
                        Start Pipeline <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
