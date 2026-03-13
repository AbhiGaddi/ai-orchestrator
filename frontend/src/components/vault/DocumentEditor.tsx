import React, { useState, useEffect } from 'react';
import { useVaultStore } from '@/store/vault';
import { Save, Eye, Edit3, Tag, Trash2 } from 'lucide-react';

export function DocumentEditor({ documentId }: { documentId: string }) {
    const { documents, updateDocument, deleteDocument } = useVaultStore();
    const doc = documents.find(d => d.id === documentId);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [isPreview, setIsPreview] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (doc) {
            setTitle(doc.title);
            setContent(doc.content);
            setTags(doc.tags.join(', '));
            setIsPreview(false);
        }
    }, [doc]);

    if (!doc) return <div className="text-gray-500 h-full flex items-center justify-center">Document not found</div>;

    const handleSave = async () => {
        setSaving(true);
        await updateDocument(doc.id, {
            title,
            content,
            tags: tags.split(',').map(s => s.trim()).filter(Boolean)
        });
        setSaving(false);
    };

    return (
        <div className="h-full flex flex-col bg-[#09090b] rounded-lg border border-[#374151] overflow-hidden">
            {/* Navbar */}
            <div className="flex justify-between items-center p-4 border-b border-[#374151] bg-[#111827]">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-transparent border-none text-xl font-bold text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500 px-2 py-1 rounded w-1/2 transition-shadow"
                    placeholder="Document Title"
                />
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1f2937] rounded-md border border-[#374151]">
                        <Tag size={13} className="text-gray-400" />
                        <input
                            type="text"
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            placeholder="ai, setup..."
                            className="bg-transparent text-xs text-gray-300 border-none focus:outline-none w-32"
                        />
                    </div>

                    <div className="flex bg-[#1f2937] rounded-md border border-[#374151] p-0.5">
                        <button
                            onClick={() => setIsPreview(false)}
                            className={`p-1.5 rounded text-sm flex items-center gap-1.5 transition-colors ${!isPreview ? 'bg-[#374151] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <Edit3 size={14} /> Edit
                        </button>
                        <button
                            onClick={() => setIsPreview(true)}
                            className={`p-1.5 rounded text-sm flex items-center gap-1.5 transition-colors ${isPreview ? 'bg-[#374151] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <Eye size={14} /> Preview
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-md shadow disabled:opacity-50 transition-colors"
                    >
                        <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={() => { if (window.confirm('Delete document?')) deleteDocument(doc.id); }}
                        className="p-1.5 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-[#1f2937] rounded-md transition-colors"
                        title="Delete Document"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-hidden relative">
                {isPreview ? (
                    <div className="w-full h-full p-6 text-gray-200 overflow-y-auto markdown-preview" style={{ fontFamily: 'sans-serif', lineHeight: 1.6 }}>
                        {/* Extremely basic markdown rendering for preview placeholder */}
                        <div dangerouslySetInnerHTML={{
                            __html: content
                                .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
                                .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-2 border-b border-gray-700 pb-1">$1</h2>')
                                .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
                                .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                                .replace(/`(.*?)`/gim, '<code class="bg-gray-800 text-violet-400 px-1 py-0.5 rounded text-sm">$1</code>')
                                .replace(/\n\n/gim, '<br/><br/>')
                        }} />
                    </div>
                ) : (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full p-6 bg-transparent border-none text-gray-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                        placeholder="Type your markdown here..."
                        spellCheck="false"
                    />
                )}
            </div>
        </div>
    );
}
