import { createElement, useCallback, useRef } from 'react';

export const useSwapClassroomUtils = (classId, user, socket) => {
    const messageRefs = useRef({});
    const typingTimeoutRef = useRef(null);
    const emittedTypingRef = useRef(false);
    const noteBroadcastTimeoutRef = useRef(null);

    // Merge items by ID, removing duplicates
    const mergeUniqueById = useCallback((items) => {
        const map = new Map();
        items.forEach((item) => {
            map.set(item.id, item);
        });
        return Array.from(map.values());
    }, []);

    // Format timestamp for message display
    const formatMessageTimestamp = useCallback((value) => {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '--:--';
        return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    // Get message status text (Sent/Seen)
    const getMessageStatusText = useCallback((msg) => (msg.isRead ? '✓✓ Seen' : '✓ Sent'), []);

    // Check if message is grouped with previous
    const isGroupedWithPrevious = useCallback((messages, index) => {
        if (index === 0) return false;
        const prev = messages[index - 1];
        const current = messages[index];
        if (!prev || !current) return false;
        if (prev.senderId !== current.senderId) return false;
        const diff = Math.abs(new Date(current.createdAt) - new Date(prev.createdAt));
        return diff < 5 * 60 * 1000;
    }, []);

    // Highlight search text in message
    const highlightedText = useCallback((text, searchQuery) => {
        if (!searchQuery?.trim()) return text;
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'ig');
        const parts = String(text || '').split(regex);
        return parts.map((part, idx) => {
            const key = `${part}-${idx}`;
            if (idx % 2 === 1) {
                return createElement(
                    'mark',
                    { key, className: 'rounded bg-[#0A4D9F]/40 px-0.5 text-[#DCE7F5]' },
                    part
                );
            }
            return createElement('span', { key }, part);
        });
    }, []);

    // Apply markdown format to note content
    const applyMarkdownFormat = useCallback((format, sharedNote, setSharedNote) => {
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

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 2, start + 2 + selectedText.length);
        }, 0);
    }, []);

    // Build task description with assignee
    const buildTaskDescription = useCallback((assignedUserId) => {
        if (!assignedUserId) return null;
        return `[ASSIGNEE:${assignedUserId}]`;
    }, []);

    // Parse assignee from task description
    const parseTaskAssignedUserId = useCallback((description) => {
        const match = String(description || '').match(/\[ASSIGNEE:(\d+)\]/);
        if (!match?.[1]) return null;
        const parsed = Number(match[1]);
        return Number.isInteger(parsed) ? parsed : null;
    }, []);

    // Apply reaction change to messages
    const applyReactionChange = useCallback((prevState, messageId, emoji, previousEmoji) => {
        if (!emoji && !previousEmoji) return prevState;
        
        const reactionMap = { ...(prevState[messageId] || {}) };
        
        if (previousEmoji && reactionMap[previousEmoji]) {
            reactionMap[previousEmoji] -= 1;
            if (reactionMap[previousEmoji] <= 0) {
                delete reactionMap[previousEmoji];
            }
        }
        
        if (emoji) {
            reactionMap[emoji] = (reactionMap[emoji] || 0) + 1;
        }
        
        if (Object.keys(reactionMap).length === 0) {
            const { [messageId]: _, ...rest } = prevState;
            return rest;
        }
        
        return {
            ...prevState,
            [messageId]: reactionMap
        };
    }, []);

    return {
        messageRefs,
        typingTimeoutRef,
        emittedTypingRef,
        noteBroadcastTimeoutRef,
        mergeUniqueById,
        formatMessageTimestamp,
        getMessageStatusText,
        isGroupedWithPrevious,
        highlightedText,
        applyMarkdownFormat,
        buildTaskDescription,
        parseTaskAssignedUserId,
        applyReactionChange
    };
};
