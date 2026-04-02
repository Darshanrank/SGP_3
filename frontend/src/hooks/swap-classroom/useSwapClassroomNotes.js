import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { updateSharedNote as updateSharedNoteApi, getSharedNote as getSharedNoteApi } from '../services/classroom.service';

export const useSwapClassroomNotes = (classId, socket, user) => {
    const [sharedNote, setSharedNote] = useState('');
    const [sharedNoteLoaded, setSharedNoteLoaded] = useState(false);
    const [sharedNoteDirty, setSharedNoteDirty] = useState(false);
    const [savingSharedNote, setSavingSharedNote] = useState(false);
    const [sharedNoteUpdatedAt, setSharedNoteUpdatedAt] = useState(null);
    const [noteVersionHistory, setNoteVersionHistory] = useState([]);
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    const noteBroadcastTimeoutRef = useRef(null);

    // Save note version to history
    const saveNoteVersion = useCallback((content) => {
        const timestamp = new Date().toISOString();
        const editorName = user?.username || 'Unknown';
        setNoteVersionHistory((prev) => [
            {
                id: prev.length + 1,
                content,
                timestamp,
                editedBy: editorName
            },
            ...prev
        ].slice(0, 10));
    }, [user?.username]);

    // Persist note to server
    const persistSharedNote = useCallback(async (content) => {
        try {
            setSavingSharedNote(true);
            const note = await updateSharedNoteApi(classId, content);
            saveNoteVersion(content);
            setSharedNoteDirty(false);
            setSharedNoteUpdatedAt(note?.updatedAt || new Date().toISOString());
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to save shared notes');
        } finally {
            setSavingSharedNote(false);
        }
    }, [classId, saveNoteVersion]);

    // Handle note change
    const handleSharedNoteChange = useCallback((event) => {
        const value = event.target.value;
        setSharedNote(value);
        setSharedNoteDirty(true);

        if (socket) {
            clearTimeout(noteBroadcastTimeoutRef.current);
            noteBroadcastTimeoutRef.current = setTimeout(() => {
                socket.emit('shared_note_edit', {
                    classId,
                    content: value
                });
            }, 250);
        }
    }, [classId, socket]);

    // Handle note blur to save
    const handleSharedNoteBlur = useCallback(async () => {
        if (!sharedNoteDirty) return;
        await persistSharedNote(sharedNote);
    }, [sharedNoteDirty, sharedNote, persistSharedNote]);

    // Apply markdown format
    const applyMarkdownFormat = useCallback((format) => {
        const textarea = document.getElementById('shared-note-textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = sharedNote.substring(start, end) || 'text';
        const beforeText = sharedNote.substring(0, start);
        const afterText = sharedNote.substring(end);

        let newText = sharedNote;

        switch (format) {
            case 'bold':
                newText = beforeText + `**${selectedText}**` + afterText;
                break;
            case 'code':
                newText = beforeText + `\`${selectedText}\`` + afterText;
                break;
            case 'heading':
                newText = beforeText + `# ${selectedText}\n` + afterText;
                break;
            case 'list':
                newText = beforeText + `- ${selectedText}\n` + afterText;
                break;
            case 'codeblock':
                newText = beforeText + `\`\`\`\n${selectedText}\n\`\`\`\n` + afterText;
                break;
            default:
                break;
        }

        setSharedNote(newText);
        setSharedNoteDirty(true);

        if (socket) {
            clearTimeout(noteBroadcastTimeoutRef.current);
            noteBroadcastTimeoutRef.current = setTimeout(() => {
                socket.emit('shared_note_edit', {
                    classId,
                    content: newText
                });
            }, 250);
        }

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 2, start + 2 + selectedText.length);
        }, 0);
    }, [sharedNote, classId, socket]);

    // Restore from version history
    const handleRestoreVersion = useCallback((version) => {
        setSharedNote(version.content);
        setSharedNoteDirty(true);
        setShowVersionHistory(false);
        toast.success('Version restored (not yet saved to server)');
        
        if (socket) {
            clearTimeout(noteBroadcastTimeoutRef.current);
            noteBroadcastTimeoutRef.current = setTimeout(() => {
                socket.emit('shared_note_edit', {
                    classId,
                    content: version.content
                });
            }, 250);
        }
    }, [classId, socket]);

    // Load note from server
    const loadSharedNote = useCallback(async () => {
        try {
            const note = await getSharedNoteApi(classId);
            const noteContent = note?.content ?? '';
            const noteUpdated = note?.updatedAt ?? null;
            setSharedNote(noteContent);
            setSharedNoteUpdatedAt(noteUpdated);
            setSharedNoteLoaded(true);
        } catch (error) {
            toast.error('Failed to load shared notes');
            setSharedNoteLoaded(true);
        }
    }, [classId]);

    return {
        // State
        sharedNote,
        sharedNoteLoaded,
        sharedNoteDirty,
        savingSharedNote,
        sharedNoteUpdatedAt,
        noteVersionHistory,
        showVersionHistory,
        // Refs
        noteBroadcastTimeoutRef,
        // Setters
        setSharedNote,
        setSharedNoteLoaded,
        setSharedNoteDirty,
        setSavingSharedNote,
        setSharedNoteUpdatedAt,
        setNoteVersionHistory,
        setShowVersionHistory,
        // Handlers
        saveNoteVersion,
        persistSharedNote,
        handleSharedNoteChange,
        handleSharedNoteBlur,
        applyMarkdownFormat,
        handleRestoreVersion,
        loadSharedNote
    };
};
