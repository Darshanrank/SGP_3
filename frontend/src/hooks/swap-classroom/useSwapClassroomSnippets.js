import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { addCodeSnippet as addCodeSnippetApi, deleteCodeSnippet as deleteCodeSnippetApi } from '../services/classroom.service';

export const useSwapClassroomSnippets = (classId) => {
    const [snippets, setSnippets] = useState([]);
    const [snippetTitle, setSnippetTitle] = useState('');
    const [snippetLanguage, setSnippetLanguage] = useState('javascript');
    const [snippetCode, setSnippetCode] = useState('');
    const [savingSnippet, setSavingSnippet] = useState(false);

    const [editingSnippetId, setEditingSnippetId] = useState(null);
    const [editSnippetTitle, setEditSnippetTitle] = useState('');
    const [editSnippetLanguage, setEditSnippetLanguage] = useState('javascript');
    const [editSnippetCode, setEditSnippetCode] = useState('');
    const [savingSnippetEdit, setSavingSnippetEdit] = useState(false);

    // Add snippet
    const handleAddSnippet = useCallback(async (event) => {
        event.preventDefault();
        const title = snippetTitle.trim();
        const code = snippetCode.trim();

        if (!title || !code) {
            toast.error('Snippet title and code are required');
            return;
        }

        try {
            setSavingSnippet(true);
            const created = await addCodeSnippetApi(classId, {
                title,
                language: snippetLanguage,
                code
            });
            setSnippets((prev) => [created, ...prev]);
            setSnippetTitle('');
            setSnippetCode('');
            toast.success('Snippet saved');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to save snippet');
        } finally {
            setSavingSnippet(false);
        }
    }, [classId, snippetTitle, snippetLanguage, snippetCode]);

    // Delete snippet
    const handleDeleteSnippet = useCallback(async (snippetId) => {
        try {
            await deleteCodeSnippetApi(classId, snippetId);
            setSnippets((prev) => prev.filter((item) => item.id !== snippetId));
            toast.success('Snippet deleted');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to delete snippet');
        }
    }, [classId]);

    // Copy snippet code
    const handleCopySnippet = useCallback(async (snippet) => {
        try {
            await navigator.clipboard.writeText(snippet.code || '');
            toast.success('Code copied');
        } catch (_) {
            toast.error('Failed to copy code');
        }
    }, []);

    // Edit snippet
    const handleEditSnippet = useCallback((snippet) => {
        setEditingSnippetId(snippet.id);
        setEditSnippetTitle(snippet.title);
        setEditSnippetLanguage(snippet.language);
        setEditSnippetCode(snippet.code);
    }, []);

    // Save edited snippet
    const handleSaveEditedSnippet = useCallback(async () => {
        if (!editSnippetTitle.trim() || !editSnippetCode.trim()) {
            toast.error('Title and code are required');
            return;
        }

        try {
            setSavingSnippetEdit(true);
            setSnippets((prev) =>
                prev.map((snippet) =>
                    snippet.id === editingSnippetId
                        ? {
                            ...snippet,
                            title: editSnippetTitle,
                            language: editSnippetLanguage,
                            code: editSnippetCode
                        }
                        : snippet
                )
            );
            setEditingSnippetId(null);
            toast.success('Snippet updated');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update snippet');
        } finally {
            setSavingSnippetEdit(false);
        }
    }, [editingSnippetId, editSnippetTitle, editSnippetLanguage, editSnippetCode]);

    // Cancel edit
    const handleCancelEditSnippet = useCallback(() => {
        setEditingSnippetId(null);
        setEditSnippetTitle('');
        setEditSnippetLanguage('javascript');
        setEditSnippetCode('');
    }, []);

    return {
        // Snippet creation
        snippets,
        snippetTitle,
        snippetLanguage,
        snippetCode,
        savingSnippet,
        setSnippets,
        setSnippetTitle,
        setSnippetLanguage,
        setSnippetCode,
        setSavingSnippet,
        // Snippet editing
        editingSnippetId,
        editSnippetTitle,
        editSnippetLanguage,
        editSnippetCode,
        savingSnippetEdit,
        setEditingSnippetId,
        setEditSnippetTitle,
        setEditSnippetLanguage,
        setEditSnippetCode,
        setSavingSnippetEdit,
        // Handlers
        handleAddSnippet,
        handleDeleteSnippet,
        handleCopySnippet,
        handleEditSnippet,
        handleSaveEditedSnippet,
        handleCancelEditSnippet
    };
};
