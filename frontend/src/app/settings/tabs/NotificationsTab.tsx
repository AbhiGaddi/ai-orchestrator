import React from 'react';

export default function NotificationsTab({ formData, handleChange, handleSave, saving }: any) {
    return (
        <div className="flex flex-col gap-8">
            {/* Telegram */}
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h2 className="text-xl font-bold mb-4 text-gray-200">Telegram</h2>
                <div className="grid gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Bot Token</label>
                        <input
                            type="text"
                            name="telegramToken"
                            value={formData.telegramToken || ''}
                            onChange={handleChange}
                            placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                            className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Registered Chat IDs (comma separated)</label>
                        <input
                            type="text"
                            name="telegramChatIds"
                            value={Array.isArray(formData.telegramChatIds) ? formData.telegramChatIds.join(', ') : (formData.telegramChatIds || '')}
                            onChange={handleChange}
                            placeholder="123456789, 987654321"
                            className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            id="telegramEnabled"
                            name="telegramEnabled"
                            checked={formData.telegramEnabled || false}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]"
                        />
                        <label htmlFor="telegramEnabled" className="text-sm font-medium text-gray-400">
                            Enable Telegram
                        </label>
                    </div>
                </div>
            </div>

            {/* Slack */}
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h2 className="text-xl font-bold mb-4 text-gray-200">Slack</h2>
                <div className="grid gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Bot Token (xoxb-)</label>
                        <input
                            type="text"
                            name="slackBotToken"
                            value={formData.slackBotToken || ''}
                            onChange={handleChange}
                            placeholder="xoxb-..."
                            className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">App Token (xapp-)</label>
                        <input
                            type="text"
                            name="slackAppToken"
                            value={formData.slackAppToken || ''}
                            onChange={handleChange}
                            placeholder="xapp-..."
                            className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            id="slackEnabled"
                            name="slackEnabled"
                            checked={formData.slackEnabled || false}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]"
                        />
                        <label htmlFor="slackEnabled" className="text-sm font-medium text-gray-400">
                            Enable Slack
                        </label>
                    </div>
                </div>
            </div>

            {/* General Notifications */}
            <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
                <h2 className="text-xl font-bold mb-4 text-gray-200">Notifications</h2>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="notifyOnComplete"
                            name="notifyOnComplete"
                            checked={formData.notifyOnComplete || false}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]"
                        />
                        <label htmlFor="notifyOnComplete" className="text-sm font-medium text-gray-400">
                            Notify on agent complete
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="notifyOnError"
                            name="notifyOnError"
                            checked={formData.notifyOnError || false}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]"
                        />
                        <label htmlFor="notifyOnError" className="text-sm font-medium text-gray-400">
                            Notify on agent error
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="notifyOnWaiting"
                            name="notifyOnWaiting"
                            checked={formData.notifyOnWaiting || false}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]"
                        />
                        <label htmlFor="notifyOnWaiting" className="text-sm font-medium text-gray-400">
                            Notify on agent waiting
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded transition-colors"
                >
                    {saving ? 'Saving...' : 'Save Notifications'}
                </button>
            </div>

        </div>
    );
}
