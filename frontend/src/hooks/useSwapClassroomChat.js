import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getMessages, sendMessage, sendAttachmentMessage, searchMessages } from '../services/classroom.service';

export const useSwapClassroomChat = (classId, socket, user, mergeUniqueById, applyReactionChange) => {
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [messagesMeta, setMessagesMeta] = useState({ hasMore: false, nextCursor: null, total: 0 });
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [messageReactions, setMessageReactions] = useState({});
    const [myReactionByMessage, setMyReactionByMessage] = useState({});
    const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);

    const messageListRef = useRef(null);
    const chatEndRef = useRef(null);
    const messageRefs = useRef({});
    const typingTimeoutRef = useRef(null);
    const emittedTypingRef = useRef(false);

    // Load messages from API
    const loadMessages = useCallback(async ({ cursor = null, prepend = false } = {}) => {
        if (prepend) setLoadingOlder(true);

        try {
            const beforeHeight = messageListRef.current?.scrollHeight || 0;
            const payload = await getMessages(classId, { cursor, limit: 20 });
            const incoming = Array.isArray(payload?.data) ? payload.data : [];

            setMessages((prev) => {
                if (!prepend) return mergeUniqueById(incoming);
                return mergeUniqueById([...incoming, ...prev]);
            });

            setMessagesMeta({
                hasMore: Boolean(payload?.meta?.hasMore),
                nextCursor: payload?.meta?.nextCursor || null,
                total: payload?.meta?.total || 0
            });

            if (prepend && messageListRef.current) {
                requestAnimationFrame(() => {
                    const afterHeight = messageListRef.current?.scrollHeight || 0;
                    const delta = afterHeight - beforeHeight;
                    messageListRef.current.scrollTop += delta;
                });
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to load chat messages');
        } finally {
            setLoadingMessages(false);
            setLoadingOlder(false);
        }
    }, [classId, mergeUniqueById]);

    // Send message
    const handleSendMessage = useCallback(async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        if (socket) socket.emit('stopTyping', classId);
        emittedTypingRef.current = false;
        clearTimeout(typingTimeoutRef.current);

        try {
            setSendingMessage(true);
            let created;
            if (selectedFile) {
                created = await sendAttachmentMessage(classId, selectedFile, newMessage.trim());
            } else {
                created = await sendMessage(classId, newMessage.trim());
            }

            setMessages((prev) => mergeUniqueById([...prev, created]));
            setNewMessage('');
            setSelectedFile(null);
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            toast.error(apiMessage || 'Failed to send');
        } finally {
            setSendingMessage(false);
        }
    }, [newMessage, selectedFile, classId, socket, mergeUniqueById]);

    // Handle input change with typing indicator
    const handleInputChange = useCallback((e) => {
        setNewMessage(e.target.value);
        if (socket && !emittedTypingRef.current) {
            socket.emit('typing', classId);
            emittedTypingRef.current = true;
        }
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (socket) socket.emit('stopTyping', classId);
            emittedTypingRef.current = false;
        }, 2000);
    }, [socket, classId]);

    // Load older messages on scroll
    const handleLoadOlder = useCallback(async () => {
        if (!messagesMeta.hasMore || !messagesMeta.nextCursor || loadingOlder) return;
        await loadMessages({ cursor: messagesMeta.nextCursor, prepend: true });
    }, [loadingOlder, messagesMeta.hasMore, messagesMeta.nextCursor, loadMessages]);

    // Handle chat scroll
    const handleChatScroll = useCallback(async (event) => {
        if (event.currentTarget.scrollTop < 80) {
            await handleLoadOlder();
        }
    }, [handleLoadOlder]);

    // Search messages
    const handleSearch = useCallback(async () => {
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSearchResults([]);
            setActiveSearchIndex(0);
            return;
        }

        try {
            setSearching(true);
            const result = await searchMessages(classId, trimmed, 100);
            const rows = Array.isArray(result?.data) ? result.data : [];
            setSearchResults(rows);
            setActiveSearchIndex(0);

            if (rows.length) {
                setMessages((prev) => mergeUniqueById([...prev, ...rows]));
                requestAnimationFrame(() => {
                    const target = messageRefs.current[rows[0].id];
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to search messages');
        } finally {
            setSearching(false);
        }
    }, [searchQuery, classId, mergeUniqueById]);

    // Jump to search result
    const jumpToSearchResult = useCallback((index) => {
        if (!searchResults.length) return;
        const normalizedIndex = ((index % searchResults.length) + searchResults.length) % searchResults.length;
        setActiveSearchIndex(normalizedIndex);
        const target = messageRefs.current[searchResults[normalizedIndex].id];
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [searchResults]);

    // React to message
    const handleReactToMessage = useCallback((messageId, emoji) => {
        const normalizedMessageId = Number(messageId);
        if (!Number.isInteger(normalizedMessageId)) return;

        const previousEmoji = myReactionByMessage[normalizedMessageId] || null;
        const nextEmoji = previousEmoji === emoji ? null : emoji;

        setMyReactionByMessage((prev) => {
            if (!nextEmoji) {
                const { [normalizedMessageId]: _, ...rest } = prev;
                return rest;
            }
            return {
                ...prev,
                [normalizedMessageId]: nextEmoji
            };
        });

        setMessageReactions((prev) => applyReactionChange(prev, normalizedMessageId, nextEmoji, previousEmoji));

        if (socket) {
            socket.emit('message_reaction', {
                classId,
                messageId: normalizedMessageId,
                emoji: nextEmoji,
                previousEmoji
            });
        }
    }, [messageId, myReactionByMessage, classId, socket, applyReactionChange]);

    // Append incoming message
    const appendIncomingMessage = useCallback((incomingMessage) => {
        setMessages((prev) => mergeUniqueById([...prev, incomingMessage]));
    }, [mergeUniqueById]);

    return {
        // State
        newMessage,
        messages,
        messagesMeta,
        loadingMessages,
        loadingOlder,
        searchQuery,
        searching,
        searchResults,
        activeSearchIndex,
        selectedFile,
        sendingMessage,
        partnerTyping,
        messageReactions,
        myReactionByMessage,
        activeReactionMessageId,
        // Refs
        messageListRef,
        chatEndRef,
        messageRefs,
        // Setters
        setNewMessage,
        setMessages,
        setMessagesMeta,
        setLoadingMessages,
        setLoadingOlder,
        setSearchQuery,
        setSearching,
        setSearchResults,
        setActiveSearchIndex,
        setSelectedFile,
        setSendingMessage,
        setPartnerTyping,
        setMessageReactions,
        setMyReactionByMessage,
        setActiveReactionMessageId,
        // Handlers
        loadMessages,
        handleSendMessage,
        handleInputChange,
        handleLoadOlder,
        handleChatScroll,
        handleSearch,
        jumpToSearchResult,
        handleReactToMessage,
        appendIncomingMessage
    };
};
