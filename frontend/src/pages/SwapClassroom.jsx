import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    getClassDetails,
    addClassTodo,
    toggleTodo,
    completeClass,
    addPinnedResource as addPinnedResourceApi,
    deletePinnedResource as deletePinnedResourceApi,
    addCodeSnippet as addCodeSnippetApi,
    deleteCodeSnippet as deleteCodeSnippetApi,
    uploadClassroomFile as uploadClassroomFileApi,
    getSharedNote as getSharedNoteApi,
    updateSharedNote as updateSharedNoteApi
} from '../services/swap.service';
import { getMessages, sendMessage, sendAttachmentMessage, searchMessages } from '../services/chat.service';
import { createReview, getClassReviews, hasReviewedClass, markReviewHelpful } from '../services/review.service';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Button } from '../components/ui/Button';
import InputDialog from '../components/ui/InputDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import {
    Star,
    ThumbsUp,
    Paperclip,
    Search,
    X,
    ChevronUp,
    Check,
    CheckCheck,
    Circle,
    Pin,
    Code2,
    FileText,
    StickyNote,
    Upload,
    Trash2,
    Copy,
    SendHorizontal,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    ListChecks
} from 'lucide-react';

const panelCardClass = 'rounded-xl border border-white/5 bg-[#111721] p-5 shadow-lg';
const panelTitleClass = 'text-lg font-semibold text-[#DCE7F5]';
const codeBlockClass = 'rounded-lg border border-white/5 bg-[#0A0F14] p-4 font-mono text-sm text-[#E6EEF8]';

const keywordByLanguage = {
    javascript: [
        'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'import',
        'export', 'await', 'async', 'try', 'catch', 'throw', 'true', 'false', 'null', 'undefined'
    ],
    typescript: [
        'type', 'interface', 'extends', 'implements', 'enum', 'public', 'private', 'protected', 'readonly',
        'const', 'let', 'function', 'return', 'if', 'else', 'async', 'await'
    ],
    java: [
        'public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'void',
        'new', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'final', 'this', 'super'
    ],
    python: [
        'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with',
        'import', 'from', 'as', 'True', 'False', 'None', 'lambda'
    ],
    c: [
        'int', 'float', 'double', 'char', 'void', 'if', 'else', 'for', 'while', 'return', 'struct', 'typedef',
        'switch', 'case', 'break', 'continue'
    ],
    cpp: [
        'int', 'float', 'double', 'char', 'void', 'if', 'else', 'for', 'while', 'return', 'class', 'public',
        'private', 'protected', 'namespace', 'using', 'std', 'template', 'auto', 'const'
    ]
};

const normalizeLanguage = (value) => String(value || 'text').trim().toLowerCase();

const renderHighlightedCodeLine = (line, language) => {
    const keywords = keywordByLanguage[normalizeLanguage(language)] || [];
    if (!keywords.length || !line) return line || ' ';

    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    const parts = line.split(regex);

    return parts.map((part, index) => {
        if (keywords.includes(part)) {
            return (
                <span key={`${part}-${index}`} className="text-[#7BB2FF]">
                    {part}
                </span>
            );
        }
        return <span key={`${part}-${index}`}>{part || (index === parts.length - 1 ? ' ' : '')}</span>;
    });
};

const toDateTime = (value) => {
    if (!value) return 'just now';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'just now';
    return parsed.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const REVIEW_CATEGORY_CONFIG = [
    { key: 'clarityRating', label: 'Clarity' },
    { key: 'punctualityRating', label: 'Punctuality' },
    { key: 'communicationRating', label: 'Communication' },
    { key: 'expertiseRating', label: 'Expertise' }
];

const getEmptyCategoryRatings = () => ({
    clarityRating: 0,
    punctualityRating: 0,
    communicationRating: 0,
    expertiseRating: 0
});

const computeOverallFromCategories = (ratings) => {
    const values = REVIEW_CATEGORY_CONFIG.map((item) => Number(ratings[item.key] || 0));
    if (values.some((value) => value <= 0)) return 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
};

const SwapClassroom = () => {
    const { id } = useParams();
    const classId = Number(id);
    const { user } = useAuth();
    const { socket, clearChatUnread } = useSocket();

    const [swapClass, setSwapClass] = useState(null);
    const [loading, setLoading] = useState(true);

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
    const [partnerOnline, setPartnerOnline] = useState(false);

    const [resources, setResources] = useState([]);
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceUrl, setResourceUrl] = useState('');
    const [savingResource, setSavingResource] = useState(false);

    const [snippets, setSnippets] = useState([]);
    const [snippetTitle, setSnippetTitle] = useState('');
    const [snippetLanguage, setSnippetLanguage] = useState('javascript');
    const [snippetCode, setSnippetCode] = useState('');
    const [savingSnippet, setSavingSnippet] = useState(false);

    const [classroomFiles, setClassroomFiles] = useState([]);
    const [uploadingClassroomFile, setUploadingClassroomFile] = useState(false);

    const [sharedNote, setSharedNote] = useState('');
    const [sharedNoteLoaded, setSharedNoteLoaded] = useState(false);
    const [sharedNoteDirty, setSharedNoteDirty] = useState(false);
    const [savingSharedNote, setSavingSharedNote] = useState(false);
    const [sharedNoteUpdatedAt, setSharedNoteUpdatedAt] = useState(null);

    const [collapsedPanels, setCollapsedPanels] = useState({
        classroom: false,
        tasks: false,
        notes: false,
        snippets: false,
        files: false,
        resources: false,
        reviews: false
    });

    // Review state
    const [reviewRatings, setReviewRatings] = useState(getEmptyCategoryRatings);
    const [reviewHoverMap, setReviewHoverMap] = useState(getEmptyCategoryRatings);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [myReviewStatus, setMyReviewStatus] = useState({ hasReviewed: false, review: null });
    const [classReviews, setClassReviews] = useState([]);

    // Dialog state
    const [todoDialogOpen, setTodoDialogOpen] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

    // Typing indicator state
    const [partnerTyping, setPartnerTyping] = useState(false);

    const messageListRef = useRef(null);
    const fileInputRef = useRef(null);
    const classroomFileInputRef = useRef(null);
    const chatEndRef = useRef(null);
    const messageRefs = useRef({});
    const typingTimeoutRef = useRef(null);
    const emittedTypingRef = useRef(false);
    const noteBroadcastTimeoutRef = useRef(null);

    const togglePanel = (key) => {
        setCollapsedPanels((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const mergeUniqueById = (items) => {
        const map = new Map();
        items.forEach((item) => {
            if (!item?.id) return;
            map.set(item.id, item);
        });
        return Array.from(map.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    };

    const appendIncomingMessage = (incomingMessage) => {
        if (!incomingMessage?.id) return;
        setMessages((prev) => mergeUniqueById([...prev, incomingMessage]));
    };

    const loadMessages = async ({ cursor = null, prepend = false } = {}) => {
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
    };

    const persistSharedNote = async (content) => {
        try {
            setSavingSharedNote(true);
            const note = await updateSharedNoteApi(classId, content);
            setSharedNoteDirty(false);
            setSharedNoteUpdatedAt(note?.updatedAt || new Date().toISOString());
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to save shared notes');
        } finally {
            setSavingSharedNote(false);
        }
    };

    useEffect(() => {
        const fetchClassData = async () => {
            try {
                const [data, note] = await Promise.all([
                    getClassDetails(classId),
                    getSharedNoteApi(classId)
                ]);

                setSwapClass(data);
                setResources(Array.isArray(data?.pinnedResources) ? data.pinnedResources : []);
                setSnippets(Array.isArray(data?.codeSnippets) ? data.codeSnippets : []);
                setClassroomFiles(Array.isArray(data?.classroomFiles) ? data.classroomFiles : []);

                const noteContent = note?.content ?? data?.sharedNote?.content ?? '';
                const noteUpdated = note?.updatedAt ?? data?.sharedNote?.updatedAt ?? null;
                setSharedNote(noteContent);
                setSharedNoteUpdatedAt(noteUpdated);
                setSharedNoteLoaded(true);

                if (data?.status === 'COMPLETED') {
                    try {
                        const [reviewStatus, reviews] = await Promise.all([
                            hasReviewedClass(classId),
                            getClassReviews(classId)
                        ]);
                        setMyReviewStatus(reviewStatus);
                        setClassReviews(reviews || []);
                    } catch (_) {}
                }
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Failed to load classroom');
            } finally {
                setLoading(false);
            }
        };

        fetchClassData();
    }, [classId]);

    useEffect(() => {
        setLoadingMessages(true);
        setMessages([]);
        setMessagesMeta({ hasMore: false, nextCursor: null, total: 0 });
        clearChatUnread(classId);
        loadMessages({ cursor: null, prepend: false });
    }, [classId, clearChatUnread]);

    useEffect(() => {
        if (!socket) return;

        const joinRoom = () => {
            socket.emit('join_chat', classId);
        };

        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);
        return () => {
            socket.off('connect', joinRoom);
        };
    }, [socket, classId]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (incomingMessage) => {
            appendIncomingMessage(incomingMessage);
        };

        const handleSocketError = (msg) => {
            if (msg === 'Not authorized for this class') {
                toast.error('Not authorized for this class');
            }
        };

        const handlePresence = ({ userIds = [] }) => {
            if (!swapClass?.swapRequest) return;
            const partnerId = swapClass.swapRequest.fromUserId === user?.userId
                ? swapClass.swapRequest.toUserId
                : swapClass.swapRequest.fromUserId;
            setPartnerOnline(userIds.includes(partnerId));
        };

        const handleUserTyping = ({ userId: typingUserId }) => {
            if (typingUserId !== user.userId) {
                setPartnerTyping(true);
            }
        };

        const handleUserStopTyping = ({ userId: typingUserId }) => {
            if (typingUserId !== user.userId) {
                setPartnerTyping(false);
            }
        };

        const handleMessagesRead = ({ readAt }) => {
            setMessages((prev) => prev.map((msg) => {
                if (msg.senderId !== user.userId) return msg;
                return {
                    ...msg,
                    isRead: true,
                    readAt: readAt || msg.readAt || new Date().toISOString()
                };
            }));
        };

        const handleMessagesDelivered = ({ deliveredAt }) => {
            setMessages((prev) => prev.map((msg) => {
                if (msg.senderId !== user.userId || msg.deliveredAt) return msg;
                return {
                    ...msg,
                    deliveredAt: deliveredAt || new Date().toISOString()
                };
            }));
        };

        const handleSharedNoteUpdated = ({ classId: updatedClassId, content, updatedAt, updatedBy }) => {
            if (Number(updatedClassId) !== classId) return;
            if (updatedBy === user?.userId) return;
            setSharedNote(String(content || ''));
            setSharedNoteDirty(false);
            setSharedNoteUpdatedAt(updatedAt || new Date().toISOString());
        };

        socket.on('receive_message', handleNewMessage);
        socket.on('error', handleSocketError);
        socket.on('user_typing', handleUserTyping);
        socket.on('typing', handleUserTyping);
        socket.on('user_stop_typing', handleUserStopTyping);
        socket.on('stopTyping', handleUserStopTyping);
        socket.on('messages_read', handleMessagesRead);
        socket.on('messages_delivered', handleMessagesDelivered);
        socket.on('chat_presence', handlePresence);
        socket.on('shared_note_updated', handleSharedNoteUpdated);

        return () => {
            socket.off('receive_message', handleNewMessage);
            socket.off('error', handleSocketError);
            socket.off('user_typing', handleUserTyping);
            socket.off('typing', handleUserTyping);
            socket.off('user_stop_typing', handleUserStopTyping);
            socket.off('stopTyping', handleUserStopTyping);
            socket.off('messages_read', handleMessagesRead);
            socket.off('messages_delivered', handleMessagesDelivered);
            socket.off('chat_presence', handlePresence);
            socket.off('shared_note_updated', handleSharedNoteUpdated);
        };
    }, [socket, classId, swapClass, user?.userId]);

    useEffect(() => {
        if (messages.length > 0 && !loadingOlder) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        if (socket && messages.length > 0) {
            socket.emit('mark_read', classId);
            clearChatUnread(classId);
        }
    }, [messages.length, socket, classId, clearChatUnread, loadingOlder]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && socket) {
                socket.emit('mark_read', classId);
                clearChatUnread(classId);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [socket, classId, clearChatUnread]);

    useEffect(() => {
        if (!sharedNoteLoaded || !sharedNoteDirty) return;

        const timeoutId = setTimeout(() => {
            persistSharedNote(sharedNote);
        }, 3000);

        return () => clearTimeout(timeoutId);
    }, [sharedNote, sharedNoteDirty, sharedNoteLoaded]);

    const handleInputChange = (e) => {
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
    };

    const handleSendMessage = async (e) => {
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

            appendIncomingMessage(created);
            setNewMessage('');
            setSelectedFile(null);
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            toast.error(apiMessage || 'Failed to send');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleLoadOlder = async () => {
        if (!messagesMeta.hasMore || !messagesMeta.nextCursor || loadingOlder) return;
        await loadMessages({ cursor: messagesMeta.nextCursor, prepend: true });
    };

    const handleChatScroll = async (event) => {
        if (event.currentTarget.scrollTop < 80) {
            await handleLoadOlder();
        }
    };

    const handleSearch = async () => {
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
    };

    const jumpToSearchResult = (index) => {
        if (!searchResults.length) return;
        const normalizedIndex = ((index % searchResults.length) + searchResults.length) % searchResults.length;
        setActiveSearchIndex(normalizedIndex);
        const target = messageRefs.current[searchResults[normalizedIndex].id];
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const highlightedText = (text) => {
        if (!searchQuery.trim()) return text;
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'ig');
        const parts = String(text || '').split(regex);
        return parts.map((part, idx) => (
            idx % 2 === 1
                ? <mark key={`${part}-${idx}`} className="rounded bg-[#0A4D9F]/40 px-0.5 text-[#DCE7F5]">{part}</mark>
                : <span key={`${part}-${idx}`}>{part}</span>
        ));
    };

    const isGroupedWithPrevious = (index) => {
        if (index === 0) return false;
        const prev = messages[index - 1];
        const current = messages[index];
        if (!prev || !current) return false;
        if (prev.senderId !== current.senderId) return false;
        const diff = Math.abs(new Date(current.createdAt) - new Date(prev.createdAt));
        return diff < 5 * 60 * 1000;
    };

    const getMessageStatusIcon = (msg) => {
        if (msg.isRead) return <CheckCheck className="h-3.5 w-3.5 text-[#60A5FA]" />;
        if (msg.deliveredAt) return <CheckCheck className="h-3.5 w-3.5 text-[#C4D4EC]" />;
        return <Check className="h-3.5 w-3.5 text-[#C4D4EC]" />;
    };

    const handleAddTodo = () => {
        setTodoDialogOpen(true);
    };

    const handleTodoDialogSubmit = async (title) => {
        setTodoDialogOpen(false);
        try {
            const todo = await addClassTodo(classId, { title });
            setSwapClass((prev) => ({
                ...prev,
                todos: [...(prev.todos || []), todo]
            }));
            toast.success('Task added');
        } catch (_) {
            toast.error('Failed to add task');
        }
    };

    const handleToggleTodo = async (todoId, currentStatus) => {
        try {
            await toggleTodo(todoId, !currentStatus);
            setSwapClass((prev) => ({
                ...prev,
                todos: (prev.todos || []).map((todo) => (
                    todo.id === todoId ? { ...todo, isCompleted: !currentStatus } : todo
                ))
            }));
        } catch (_) {
            toast.error('Failed to update task');
        }
    };

    const handleCompleteClass = () => {
        setCompleteDialogOpen(true);
    };

    const handleConfirmComplete = async () => {
        setCompleteDialogOpen(false);
        try {
            await completeClass(classId);
            toast.success('Class marked as complete');

            const data = await getClassDetails(classId);
            setSwapClass(data);

            if (data?.status === 'COMPLETED') {
                const [reviewStatus, reviews] = await Promise.all([
                    hasReviewedClass(classId),
                    getClassReviews(classId)
                ]);
                setMyReviewStatus(reviewStatus);
                setClassReviews(reviews || []);
            }
        } catch (_) {
            toast.error('Error completing class');
        }
    };

    const handleSubmitReview = async () => {
        const missingCategory = REVIEW_CATEGORY_CONFIG.find((category) => Number(reviewRatings[category.key] || 0) < 1);
        if (missingCategory) {
            toast.error(`Please rate ${missingCategory.label.toLowerCase()} (1-5 stars)`);
            return;
        }

        setReviewSubmitting(true);
        try {
            const review = await createReview({
                swapClassId: classId,
                clarityRating: reviewRatings.clarityRating,
                punctualityRating: reviewRatings.punctualityRating,
                communicationRating: reviewRatings.communicationRating,
                expertiseRating: reviewRatings.expertiseRating,
                comment: reviewComment || null
            });
            setMyReviewStatus({ hasReviewed: true, review });
            setClassReviews((prev) => [review, ...prev]);
            setReviewRatings(getEmptyCategoryRatings());
            setReviewHoverMap(getEmptyCategoryRatings());
            setReviewComment('');
            toast.success('Review submitted');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleHelpfulVote = async (reviewId) => {
        try {
            const result = await markReviewHelpful(reviewId);
            setClassReviews((prev) => prev.map((review) => (
                review.id === reviewId
                    ? { ...review, helpfulVotes: result.helpfulVotes, hasHelpfulVote: true }
                    : review
            )));

            if (!result.alreadyVoted) {
                toast.success('Marked as helpful');
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not mark review as helpful');
        }
    };

    const handleAddResource = async (event) => {
        event.preventDefault();
        const title = resourceTitle.trim();
        const url = resourceUrl.trim();

        if (!title || !url) {
            toast.error('Resource title and URL are required');
            return;
        }

        try {
            setSavingResource(true);
            const created = await addPinnedResourceApi(classId, { title, url });
            setResources((prev) => [created, ...prev]);
            setResourceTitle('');
            setResourceUrl('');
            toast.success('Resource pinned');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to pin resource');
        } finally {
            setSavingResource(false);
        }
    };

    const handleDeleteResource = async (resourceId) => {
        try {
            await deletePinnedResourceApi(classId, resourceId);
            setResources((prev) => prev.filter((item) => item.id !== resourceId));
            toast.success('Resource removed');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to remove resource');
        }
    };

    const handleAddSnippet = async (event) => {
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
    };

    const handleDeleteSnippet = async (snippetId) => {
        try {
            await deleteCodeSnippetApi(classId, snippetId);
            setSnippets((prev) => prev.filter((item) => item.id !== snippetId));
            toast.success('Snippet deleted');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to delete snippet');
        }
    };

    const handleCopySnippet = async (snippet) => {
        try {
            await navigator.clipboard.writeText(snippet.code || '');
            toast.success('Code copied');
        } catch (_) {
            toast.error('Failed to copy code');
        }
    };

    const handleShareSnippetInChat = async (snippet) => {
        try {
            const code = String(snippet.code || '');
            const preview = code.length > 1200 ? `${code.slice(0, 1200)}\n...` : code;
            const message = `Snippet: ${snippet.title} (${snippet.language})\n${preview}`;
            const created = await sendMessage(classId, message);
            appendIncomingMessage(created);
            toast.success('Snippet shared in chat');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to share snippet');
        }
    };

    const handleUploadClassroomFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploadingClassroomFile(true);
            const uploaded = await uploadClassroomFileApi(classId, file);
            setClassroomFiles((prev) => [uploaded, ...prev]);
            toast.success('File uploaded');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploadingClassroomFile(false);
            event.target.value = '';
        }
    };

    const handleSharedNoteChange = (event) => {
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
    };

    const handleSharedNoteBlur = async () => {
        if (!sharedNoteDirty) return;
        await persistSharedNote(sharedNote);
    };

    if (loading) return <div className="p-8 text-center text-[#DCE7F5]">Loading classroom...</div>;
    if (!swapClass) return <div className="p-8 text-center text-[#DCE7F5]">Class not found.</div>;

    const isFinished = swapClass.status === 'COMPLETED';
    const fromUser = swapClass.swapRequest?.fromUser;
    const toUser = swapClass.swapRequest?.toUser;
    const partner = fromUser?.userId === user?.userId ? toUser : fromUser;
    const partnerInitial = (partner?.username || 'U').charAt(0).toUpperCase();
    const chatStatusText = partnerTyping ? 'Typing...' : partnerOnline ? 'Online' : 'Offline';
    const draftOverallRating = computeOverallFromCategories(reviewRatings);
    const mostHelpfulReview = classReviews.length > 0
        ? [...classReviews].sort((a, b) => {
            if ((b.helpfulVotes || 0) !== (a.helpfulVotes || 0)) return (b.helpfulVotes || 0) - (a.helpfulVotes || 0);
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })[0]
        : null;

    const Panel = ({ panelKey, title, icon: Icon, actions, children }) => {
        const collapsed = collapsedPanels[panelKey];

        return (
            <section className={panelCardClass}>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => togglePanel(panelKey)}
                        className="inline-flex items-center gap-2 text-left"
                    >
                        {collapsed ? (
                            <ChevronRight className="h-4 w-4 text-[#8DA0BF]" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-[#8DA0BF]" />
                        )}
                        <Icon className="h-4 w-4 text-[#7BB2FF]" />
                        <h2 className={panelTitleClass}>{title}</h2>
                    </button>
                    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
                </div>

                {!collapsed ? children : null}
            </section>
        );
    };

    return (
        <div className="h-[calc(100vh-100px)] overflow-hidden bg-[#0A0F14]">
            <InputDialog
                open={todoDialogOpen}
                title="Add Task"
                placeholder="Enter task title..."
                submitLabel="Add"
                onSubmit={handleTodoDialogSubmit}
                onCancel={() => setTodoDialogOpen(false)}
            />
            <ConfirmDialog
                open={completeDialogOpen}
                title="Complete Class"
                message="Are you sure you want to mark this class as completed? This action cannot be undone."
                confirmLabel="Mark Complete"
                onConfirm={handleConfirmComplete}
                onCancel={() => setCompleteDialogOpen(false)}
            />

            <div className="mx-auto grid h-full max-w-425 grid-cols-1 gap-6 px-4 py-4 xl:grid-cols-3">
                <div className="xl:col-span-2 space-y-6 overflow-y-auto pr-1">
                    <Panel
                        panelKey="classroom"
                        title={`Classroom #${swapClass.id}`}
                        icon={StickyNote}
                        actions={
                            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${isFinished ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                {swapClass.status}
                            </span>
                        }
                    >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-[#8DA0BF]">Teaching</p>
                                <p className="mt-1 text-base font-semibold text-[#E6EEF8]">
                                    {swapClass.swapRequest.teachSkill?.skill.name || 'TBD'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-[#8DA0BF]">Learning</p>
                                <p className="mt-1 text-base font-semibold text-[#E6EEF8]">
                                    {swapClass.swapRequest.learnSkill?.skill.name || 'TBD'}
                                </p>
                            </div>
                        </div>

                        {!isFinished && (
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Button onClick={handleAddTodo} size="sm" variant="secondary">+ Add Task</Button>
                                <Button onClick={handleCompleteClass} size="sm" variant="primary">Mark Complete</Button>
                            </div>
                        )}
                    </Panel>

                    <Panel
                        panelKey="tasks"
                        title="Action Items"
                        icon={ListChecks}
                        actions={!isFinished ? (
                            <Button size="sm" variant="secondary" onClick={handleAddTodo}>
                                + Add Task
                            </Button>
                        ) : null}
                    >
                        {(!swapClass.todos || swapClass.todos.length === 0) && (
                            <p className="text-sm text-[#8DA0BF]">No tasks yet.</p>
                        )}
                        <ul className="space-y-2">
                            {(swapClass.todos || []).map((todo) => (
                                <li key={todo.id} className="flex items-center gap-3 rounded-lg bg-[#151D27] p-3">
                                    <input
                                        type="checkbox"
                                        checked={todo.isCompleted}
                                        onChange={() => handleToggleTodo(todo.id, todo.isCompleted)}
                                        className="h-4 w-4 rounded"
                                        disabled={isFinished}
                                    />
                                    <span className={`text-sm ${todo.isCompleted ? 'text-[#8DA0BF] line-through' : 'text-[#E6EEF8]'}`}>
                                        {todo.title}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel
                        panelKey="notes"
                        title="Shared Notes"
                        icon={StickyNote}
                        actions={
                            <span className="text-xs text-[#8DA0BF]">
                                {savingSharedNote ? 'Saving...' : sharedNoteDirty ? 'Unsaved changes' : `Updated ${toDateTime(sharedNoteUpdatedAt)}`}
                            </span>
                        }
                    >
                        <p className="mb-3 text-xs text-[#8DA0BF]">
                            Collaborative markdown notes. Changes sync live and autosave in a few seconds.
                        </p>
                        <textarea
                            value={sharedNote}
                            onChange={handleSharedNoteChange}
                            onBlur={handleSharedNoteBlur}
                            rows={10}
                            placeholder="Write shared notes for this session..."
                            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
                        />
                    </Panel>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Panel panelKey="snippets" title="Code Snippets" icon={Code2}>
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
                                        <option value="javascript">JavaScript</option>
                                        <option value="typescript">TypeScript</option>
                                        <option value="java">Java</option>
                                        <option value="python">Python</option>
                                        <option value="c">C</option>
                                        <option value="cpp">C++</option>
                                        <option value="text">Text</option>
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
                        </Panel>

                        <Panel
                            panelKey="files"
                            title="File History"
                            icon={FileText}
                            actions={
                                <>
                                    <input
                                        ref={classroomFileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.pdf,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                        onChange={handleUploadClassroomFile}
                                    />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={uploadingClassroomFile}
                                        onClick={() => classroomFileInputRef.current?.click()}
                                    >
                                        <Upload className="mr-1 h-3.5 w-3.5" />
                                        {uploadingClassroomFile ? 'Uploading...' : 'Upload'}
                                    </Button>
                                </>
                            }
                        >
                            <div className="space-y-2">
                                {classroomFiles.length === 0 && (
                                    <p className="text-sm text-[#8DA0BF]">No files shared yet.</p>
                                )}
                                {classroomFiles.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between rounded-lg bg-[#151D27] p-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-[#E6EEF8]">{file.fileName}</p>
                                            <p className="text-xs text-[#8DA0BF]">
                                                Uploaded by {file.uploader?.username || 'User'} • {toDateTime(file.createdAt)}
                                            </p>
                                        </div>
                                        <a
                                            href={file.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-[#7BB2FF] hover:bg-[#1A2430]"
                                        >
                                            Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    <Panel panelKey="resources" title="Pinned Resources" icon={Pin}>
                        <form onSubmit={handleAddResource} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            <input
                                type="text"
                                value={resourceTitle}
                                onChange={(e) => setResourceTitle(e.target.value)}
                                placeholder="Resource title"
                                className="rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
                            />
                            <input
                                type="url"
                                value={resourceUrl}
                                onChange={(e) => setResourceUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none md:col-span-2"
                            />
                            <div className="md:col-span-3">
                                <Button type="submit" size="sm" disabled={savingResource}>
                                    {savingResource ? 'Saving...' : 'Pin Resource'}
                                </Button>
                            </div>
                        </form>

                        <div className="mt-4 space-y-2">
                            {resources.length === 0 && (
                                <p className="text-sm text-[#8DA0BF]">No pinned resources yet.</p>
                            )}
                            {resources.map((resource) => (
                                <div key={resource.id} className="flex items-center justify-between rounded-lg bg-[#151D27] p-3">
                                    <div className="min-w-0">
                                        <a
                                            href={resource.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 truncate text-sm text-[#E6EEF8] hover:text-[#7BB2FF]"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            {resource.title}
                                        </a>
                                        <p className="text-xs text-[#8DA0BF]">Added by {resource.creator?.username || 'User'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteResource(resource.id)}
                                        className="shrink-0 rounded-md p-1.5 text-[#FCA5A5] hover:bg-[#1A2430]"
                                        title="Remove resource"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {isFinished && (
                        <Panel panelKey="reviews" title="Reviews" icon={Star}>
                            {!myReviewStatus.hasReviewed ? (
                                <div className="mb-6 rounded-lg border border-[#4A3913] bg-[#2B220F] p-4">
                                    <p className="mb-4 text-sm font-medium text-[#FCD34D]">
                                        Rate your experience across all categories.
                                    </p>

                                    <div className="space-y-3">
                                        {REVIEW_CATEGORY_CONFIG.map((category) => {
                                            const selected = Number(reviewRatings[category.key] || 0);
                                            const hovered = Number(reviewHoverMap[category.key] || 0);
                                            const current = hovered || selected;

                                            return (
                                                <div key={category.key} className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-sm text-[#E6EEF8]">{category.label}</span>
                                                        <div className="flex items-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <button
                                                                    key={`${category.key}_${star}`}
                                                                    type="button"
                                                                    onClick={() => setReviewRatings((prev) => ({ ...prev, [category.key]: star }))}
                                                                    onMouseEnter={() => setReviewHoverMap((prev) => ({ ...prev, [category.key]: star }))}
                                                                    onMouseLeave={() => setReviewHoverMap((prev) => ({ ...prev, [category.key]: 0 }))}
                                                                    className="focus:outline-none"
                                                                >
                                                                    <Star
                                                                        className={`h-6 w-6 transition-colors ${
                                                                            star <= current ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'
                                                                        }`}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <p className="mt-3 text-xs text-[#DCE7F5]">
                                        Overall rating: {draftOverallRating > 0 ? `${draftOverallRating}/5` : 'rate all categories'}
                                    </p>

                                    <textarea
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="Write your feedback (optional)..."
                                        className="mb-3 mt-3 w-full rounded-md border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:outline-none"
                                        rows={3}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitReview}
                                        disabled={reviewSubmitting || draftOverallRating === 0}
                                    >
                                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="mb-4 rounded-lg border border-[#1C3E2A] bg-[#0E2319] p-3 text-sm text-[#86EFAC]">
                                    You've already reviewed this class ({myReviewStatus.review?.overallRating}/5 stars).
                                </div>
                            )}

                            {classReviews.length > 0 ? (
                                <div className="space-y-3">
                                    {mostHelpfulReview && (
                                        <div className="rounded-xl border border-white/10 bg-[#111721] p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[#FCD34D]">Most Helpful Review</p>
                                            {mostHelpfulReview.comment ? (
                                                <p className="mt-2 text-sm text-[#DCE7F5]">"{mostHelpfulReview.comment}"</p>
                                            ) : (
                                                <p className="mt-2 text-sm text-[#8DA0BF]">No written feedback.</p>
                                            )}
                                            <p className="mt-2 text-xs text-[#8DA0BF]">Helpful votes: {mostHelpfulReview.helpfulVotes || 0}</p>
                                        </div>
                                    )}

                                    {classReviews.map((review) => (
                                        <div key={review.id} className="bg-[#111721] border border-white/5 rounded-xl p-6 shadow-md">
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="text-sm font-semibold text-[#E6EEF8]">
                                                    {review.reviewer?.username}
                                                </span>
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((score) => (
                                                        <Star
                                                            key={score}
                                                            className={`h-4 w-4 ${score <= review.overallRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#8DA0BF]">
                                                <span>Clarity: {review.clarityRating}/5</span>
                                                <span>Punctuality: {review.punctualityRating}/5</span>
                                                <span>Communication: {review.communicationRating}/5</span>
                                                <span>Expertise: {review.expertiseRating}/5</span>
                                            </div>

                                            {review.comment && <p className="text-sm text-[#C4D4EC]">{review.comment}</p>}

                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                {review.verifiedSwap && (
                                                    <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded-full text-xs">Verified Swap</span>
                                                )}
                                                {review.recentReview && (
                                                    <span className="bg-[#0A4D9F]/30 text-[#9FC8FF] px-2 py-1 rounded-full text-xs">Recent Session</span>
                                                )}
                                                {review.completedClass && (
                                                    <span className="bg-[#7C3AED]/30 text-[#C4B5FD] px-2 py-1 rounded-full text-xs">Completed Class</span>
                                                )}
                                            </div>

                                            <div className="mt-3 flex items-center justify-between">
                                                <p className="text-xs text-[#8DA0BF]">{new Date(review.createdAt).toLocaleDateString()}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleHelpfulVote(review.id)}
                                                    disabled={Boolean(review.hasHelpfulVote)}
                                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs ${review.hasHelpfulVote ? 'bg-[#1A2430] text-[#8DA0BF]' : 'bg-[#0A4D9F] text-white hover:bg-[#083A78]'}`}
                                                >
                                                    <ThumbsUp className="h-3.5 w-3.5" />
                                                    Helpful ({review.helpfulVotes || 0})
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[#8DA0BF]">No reviews yet.</p>
                            )}
                        </Panel>
                    )}
                </div>

                <div className="flex min-h-140 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F14]">
                    <div className="space-y-3 border-b border-white/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A4D9F]/30 font-semibold text-[#DCE7F5]">
                                {partnerInitial}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#DCE7F5]">{partner?.username || 'Partner'}</p>
                                <p className="text-xs text-[#8DA0BF]">{chatStatusText}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F83A3]" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearch();
                                        }
                                    }}
                                    placeholder="Search messages"
                                    className="h-9 w-full rounded-lg border border-white/10 bg-[#111721] pl-8 pr-3 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
                                />
                            </div>
                            <Button size="sm" variant="secondary" onClick={handleSearch} disabled={searching}>
                                {searching ? '...' : 'Find'}
                            </Button>
                            {searchResults.length > 0 && (
                                <Button size="sm" variant="ghost" onClick={() => jumpToSearchResult(activeSearchIndex + 1)}>
                                    {activeSearchIndex + 1}/{searchResults.length}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div
                        ref={messageListRef}
                        onScroll={handleChatScroll}
                        className="flex-1 overflow-y-auto bg-[#0A0F14] px-3 py-3"
                    >
                        {loadingMessages ? (
                            <p className="py-4 text-center text-sm text-[#8DA0BF]">Loading messages...</p>
                        ) : (
                            <>
                                {messagesMeta.hasMore && (
                                    <div className="mb-3 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={handleLoadOlder}
                                            disabled={loadingOlder}
                                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#111721] px-3 py-1 text-xs text-[#8DA0BF] hover:text-[#DCE7F5] disabled:opacity-60"
                                        >
                                            <ChevronUp className="h-3.5 w-3.5" />
                                            {loadingOlder ? 'Loading...' : 'Load older'}
                                        </button>
                                    </div>
                                )}

                                {messages.map((msg, index) => {
                                    const isMe = msg.senderId === user.userId;
                                    const grouped = isGroupedWithPrevious(index);
                                    const hidePlaceholderText = msg.messageType !== 'TEXT' && String(msg.message || '').startsWith('[Attachment]');

                                    return (
                                        <div
                                            key={msg.id}
                                            ref={(el) => {
                                                if (el) messageRefs.current[msg.id] = el;
                                            }}
                                            className={grouped ? 'mt-1' : 'mt-3'}
                                        >
                                            {!grouped && !isMe && (
                                                <p className="mb-1 ml-10 text-xs font-medium text-[#8DA0BF]">{msg.sender?.username || 'Partner'}</p>
                                            )}

                                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2.5`}>
                                                {!isMe && (
                                                    <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#111721] text-xs font-semibold text-[#DCE7F5] ${grouped ? 'invisible' : ''}`}>
                                                        {(msg.sender?.username || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}

                                                <div className={`max-w-[65%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-normal ${isMe ? 'ml-auto bg-[#0A4D9F] text-white' : 'mr-auto border border-white/5 bg-[#111721] text-[#E6EEF8]'}`}>
                                                    {!hidePlaceholderText && msg.message && (
                                                        <p className="whitespace-pre-wrap wrap-break-word">{highlightedText(msg.message)}</p>
                                                    )}

                                                    {msg.attachmentUrl && msg.messageType === 'IMAGE' && (
                                                        <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                                                            <img src={msg.attachmentUrl} alt={msg.attachmentName || 'attachment'} className="max-h-56 w-full rounded-xl border border-white/6 object-cover" />
                                                        </a>
                                                    )}

                                                    {msg.attachmentUrl && msg.messageType === 'FILE' && (
                                                        <a
                                                            href={msg.attachmentUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mt-2 block rounded-xl border border-white/6 bg-[#111721] p-3"
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="truncate text-sm text-[#E6EEF8]">{msg.attachmentName || 'File attachment'}</span>
                                                                <span className="shrink-0 text-xs text-[#7BB2FF] underline">Download</span>
                                                            </div>
                                                        </a>
                                                    )}

                                                    <div className="mt-1 flex items-center justify-end gap-1 text-xs text-[#8DA0BF]">
                                                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMe && getMessageStatusIcon(msg)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {partnerTyping && (
                                    <div className="mt-2 ml-10 flex items-center gap-1 text-[13px] italic text-[#8DA0BF]">
                                        <Circle className="h-2 w-2 fill-current" />
                                        <span>{partner?.username || 'Partner'} is typing...</span>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </>
                        )}
                    </div>

                    <div className="space-y-2 border-t border-white/10 bg-[#0F1622] p-3">
                        {selectedFile && (
                            <div className="flex items-center justify-between rounded-xl border border-white/6 bg-[#111721] px-3 py-3 text-sm text-[#E6EEF8]">
                                <span className="truncate">{selectedFile.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFile(null)}
                                    className="ml-2 rounded p-1 hover:bg-white/10"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                disabled={isFinished}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-[#111721] text-[#8DA0BF] hover:bg-[#151D27] hover:text-[#DCE7F5]"
                                disabled={isFinished}
                            >
                                <Paperclip className="h-4 w-4" />
                            </button>

                            <input
                                type="text"
                                value={newMessage}
                                onChange={handleInputChange}
                                placeholder={selectedFile ? 'Add a caption (optional)...' : 'Type message...'}
                                className="flex-1 rounded-xl border border-white/5 bg-[#111721] px-3 py-2 text-[15px] text-[#E6EEF8] placeholder:text-[#8DA0BF] focus:border-[#0A4D9F] focus:outline-none"
                                disabled={isFinished || sendingMessage}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isFinished || sendingMessage || (!newMessage.trim() && !selectedFile)}
                                className="h-10 rounded-xl bg-[#0A4D9F] px-4 text-white hover:bg-[#083A78]"
                            >
                                {sendingMessage ? 'Sending...' : 'Send'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SwapClassroom;
