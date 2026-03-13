'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/settings';

// Tab Components
import ClaudeTab from './tabs/ClaudeTab';
import NotificationsTab from './tabs/NotificationsTab';
import HooksManager from './tabs/HooksManager';
import McpManager from './tabs/McpManager';
import PermissionsManager from './tabs/PermissionsManager';
import EnvManager from './tabs/EnvManager';

const TABS = [
    { id: 'claude', label: 'Claude Configuration' },
    { id: 'hooks', label: 'Hooks Manager' },
    { id: 'mcp', label: 'MCP Servers' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'env', label: 'Environment Variables' },
    { id: 'notifications', label: 'Notifications Setup' }
];

function SettingsContent() {
    const { settings, loading, load, update } = useSettingsStore();
    const [formData, setFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams.get('tab') || 'claude';

    useEffect(() => { load(); }, [load]);
    useEffect(() => { if (settings) setFormData(settings); }, [settings]);

    if (loading || !settings) {
        return <div className="p-8 text-white relative z-10">Loading settings...</div>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let telegramChatIds = formData.telegramChatIds || [];
            if (typeof telegramChatIds === 'string') {
                telegramChatIds = telegramChatIds.split(',').map((id: string) => id.trim()).filter(Boolean);
            }
            await update({ ...formData, telegramChatIds });
        } catch (err) {
            console.error(err);
            alert('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto text-white relative z-10 transition-all duration-300">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-[#374151] pb-4">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => router.push(`/settings?tab=${tab.id}`)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id
                            ? 'bg-violet-600 text-white shadow'
                            : 'bg-[#1f2937] hover:bg-[#374151] text-gray-400 hover:text-gray-200 border border-[#374151]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content Router */}
            <div className="min-h-[500px]">
                {activeTab === 'claude' && <ClaudeTab formData={formData} handleChange={handleChange} handleSave={handleSave} saving={saving} />}
                {activeTab === 'notifications' && <NotificationsTab formData={formData} handleChange={handleChange} handleSave={handleSave} saving={saving} />}
                {activeTab === 'hooks' && <HooksManager />}
                {activeTab === 'mcp' && <McpManager />}
                {activeTab === 'permissions' && <PermissionsManager />}
                {activeTab === 'env' && <EnvManager />}
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white relative z-10">Loading settings wrapper...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
