import { Button } from '../ui/Button';
import { Copy, SendHorizontal, Trash2 } from 'lucide-react';

const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'java', label: 'Java' },
    { value: 'python', label: 'Python' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'text', label: 'Text' }
];

const ClassroomSnippetsPanel = ({
    editingSnippetId,
    editSnippetTitle,
    setEditSnippetTitle,
    editSnippetLanguage,
    setEditSnippetLanguage,
    editSnippetCode,
    setEditSnippetCode,
    handleCancelEditSnippet,
    handleSaveEditedSnippet,
    savingSnippetEdit,
    handleAddSnippet,
    snippetTitle,
    setSnippetTitle,
    snippetLanguage,
    setSnippetLanguage,
    snippetCode,
    setSnippetCode,
    savingSnippet,
    snippets,
    handleCopySnippet,
    handleEditSnippet,
    handleShareSnippetInChat,
    handleDeleteSnippet,
    codeBlockClass,
    renderHighlightedCodeLine
}) => (
    <>
        {editingSnippetId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="rounded-xl bg-[#111721] border border-white/5 p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
                    <h2 className="text-lg font-semibold text-[#DCE7F5] mb-4">Edit Snippet</h2>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={editSnippetTitle}
                            onChange={(e) => setEditSnippetTitle(e.target.value)}
                            placeholder="Snippet title"
                            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
                        />
                        <select
                            value={editSnippetLanguage}
                            onChange={(e) => setEditSnippetLanguage(e.target.value)}
                            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] focus:border-[#0A4D9F] focus:outline-none"
                        >
                            {languageOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <textarea
                            rows={8}
                            value={editSnippetCode}
                            onChange={(e) => setEditSnippetCode(e.target.value)}
                            placeholder="Paste code here..."
                            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 font-mono text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={handleCancelEditSnippet}
                                className="px-4 py-2 rounded-lg border border-white/10 text-[#8DA0BF] hover:bg-[#1A2430] transition"
                            >
                                Cancel
                            </button>
                            <Button
                                type="button"
                                onClick={handleSaveEditedSnippet}
                                disabled={savingSnippetEdit}
                            >
                                {savingSnippetEdit ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <form onSubmit={handleAddSnippet} className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                    type="text"
                    value={snippetTitle}
                    onChange={(e) => setSnippetTitle(e.target.value)}
                    placeholder="Snippet title"
                    className="rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
                />
                <select
                    value={snippetLanguage}
                    onChange={(e) => setSnippetLanguage(e.target.value)}
                    className="rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] focus:border-[#0A4D9F] focus:outline-none"
                >
                    {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>
            <textarea
                rows={6}
                value={snippetCode}
                onChange={(e) => setSnippetCode(e.target.value)}
                placeholder="Paste code here..."
                className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 font-mono text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
            />
            <Button type="submit" size="sm" disabled={savingSnippet}>
                {savingSnippet ? 'Saving...' : 'Save Snippet'}
            </Button>
        </form>

        <div className="mt-4 space-y-3">
            {snippets.length === 0 && (
                <p className="text-sm text-[#8DA0BF]">No snippets yet.</p>
            )}
            {snippets.map((snippet) => (
                <article key={snippet.id} className="rounded-lg border border-white/5 bg-[#151D27] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#E6EEF8]">{snippet.title}</p>
                            <p className="text-xs text-[#8DA0BF]">
                                {snippet.language} • by {snippet.creator?.username || 'User'}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => handleCopySnippet(snippet)}
                                className="rounded-md p-1.5 text-[#8DA0BF] hover:bg-[#1A2430] hover:text-[#E6EEF8]"
                                title="Copy code"
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleEditSnippet(snippet)}
                                className="rounded-md p-1.5 text-[#7BB2FF] hover:bg-[#1A2430] hover:text-[#E6EEF8]"
                                title="Edit snippet"
                            >
                                ✏️
                            </button>
                            <button
                                type="button"
                                onClick={() => handleShareSnippetInChat(snippet)}
                                className="rounded-md p-1.5 text-[#8DA0BF] hover:bg-[#1A2430] hover:text-[#E6EEF8]"
                                title="Share in chat"
                            >
                                <SendHorizontal className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteSnippet(snippet.id)}
                                className="rounded-md p-1.5 text-[#FCA5A5] hover:bg-[#1A2430]"
                                title="Delete snippet"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                    <pre className={`${codeBlockClass} overflow-x-auto`}>
                        {String(snippet.code || '').split('\n').map((line, lineIndex) => (
                            <div key={`${snippet.id}-${lineIndex}`}>
                                {renderHighlightedCodeLine(line, snippet.language)}
                            </div>
                        ))}
                    </pre>
                </article>
            ))}
        </div>
    </>
);

export default ClassroomSnippetsPanel;
