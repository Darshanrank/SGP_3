const ClassroomNotesPanel = ({
    savingSharedNote,
    sharedNoteDirty,
    sharedNoteUpdatedAt,
    toDateTime,
    applyMarkdownFormat,
    saveNoteVersion,
    sharedNote,
    setShowVersionHistory,
    showVersionHistory,
    noteVersionHistory,
    handleRestoreVersion,
    handleSharedNoteChange,
    handleSharedNoteBlur
}) => (
    <>
        <p className="mb-3 text-xs text-[#8DA0BF]">
            Collaborative markdown notes. Changes sync live and autosave in a few seconds.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
            <button
                type="button"
                onClick={() => applyMarkdownFormat('bold')}
                className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs font-semibold text-[#E6EEF8] hover:bg-slate-700 hover:border-white/20 transition"
                title="Bold (Ctrl+B)"
            >
                <strong>B</strong>
            </button>
            <button
                type="button"
                onClick={() => applyMarkdownFormat('code')}
                className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs font-mono text-[#E6EEF8] hover:bg-slate-700 hover:border-white/20 transition"
                title="Inline Code"
            >
                &lt;/&gt;
            </button>
            <button
                type="button"
                onClick={() => applyMarkdownFormat('heading')}
                className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs font-bold text-[#E6EEF8] hover:bg-slate-700 hover:border-white/20 transition"
                title="Heading"
            >
                H1
            </button>
            <button
                type="button"
                onClick={() => applyMarkdownFormat('list')}
                className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-[#E6EEF8] hover:bg-slate-700 hover:border-white/20 transition"
                title="List"
            >
                • List
            </button>
            <button
                type="button"
                onClick={() => applyMarkdownFormat('codeblock')}
                className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs font-mono text-[#E6EEF8] hover:bg-slate-700 hover:border-white/20 transition"
                title="Code Block"
            >
                {'{}'}
            </button>
            <button
                type="button"
                onClick={() => {
                    saveNoteVersion(sharedNote);
                    setShowVersionHistory(!showVersionHistory);
                }}
                className="ml-auto rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-[#7BB2FF] hover:bg-slate-700 hover:border-white/20 transition"
                title="Version History"
            >
                ⏱ History
            </button>
        </div>

        {showVersionHistory && noteVersionHistory.length > 0 && (
            <div className="mb-3 rounded-lg bg-slate-900 border border-white/10 p-3 max-h-40 overflow-y-auto">
                <h4 className="text-xs font-semibold text-[#DCE7F5] mb-2">Version History</h4>
                <div className="space-y-1">
                    {noteVersionHistory.map((version) => (
                        <div key={version.id} className="text-xs">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[#8DA0BF]">
                                    {version.editedBy} edited {toDateTime(version.timestamp)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRestoreVersion(version)}
                                    className="px-2 py-0.5 rounded text-[#7BB2FF] hover:bg-slate-700 transition"
                                >
                                    Restore
                                </button>
                            </div>
                            <p className="text-[#6F83A3] truncate">{version.content?.substring(0, 80)}...</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <textarea
            id="shared-note-textarea"
            value={sharedNote}
            onChange={handleSharedNoteChange}
            onBlur={handleSharedNoteBlur}
            rows={10}
            placeholder="Write shared notes for this session..."
            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
        />
    </>
);

export const getNotesPanelStatusText = ({
    savingSharedNote,
    sharedNoteDirty,
    sharedNoteUpdatedAt,
    toDateTime
}) => {
    if (savingSharedNote) {
        return 'Saving...';
    }
    if (sharedNoteDirty) {
        return 'Unsaved changes';
    }
    return `Updated ${toDateTime(sharedNoteUpdatedAt)}`;
};

export default ClassroomNotesPanel;
