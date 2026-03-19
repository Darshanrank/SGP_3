import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClassDetails, addClassTodo, toggleTodo, completeClass } from '../services/swap.service';
import { getMessages, sendMessage, sendAttachmentMessage, searchMessages } from '../services/chat.service';
import { createReview, getClassReviews, hasReviewedClass } from '../services/review.service';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Button } from '../components/ui/Button';
import InputDialog from '../components/ui/InputDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { Star, Paperclip, Search, X, ChevronUp, Check, CheckCheck, Circle } from 'lucide-react';

const SwapClassroom = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const { socket, clearChatUnread } = useSocket();
    const [swapClass, setSwapClass] = useState(null);
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
    const [loading, setLoading] = useState(true);
    const messageListRef = useRef(null);
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);
    const messageRefs = useRef({});

    // Review state
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHover, setReviewHover] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [myReviewStatus, setMyReviewStatus] = useState({ hasReviewed: false, review: null });
    const [classReviews, setClassReviews] = useState([]);

    // Dialog state (replaces prompt / confirm)
    const [todoDialogOpen, setTodoDialogOpen] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

    // Typing indicator state
    const [partnerTyping, setPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const emittedTypingRef = useRef(false);

    const mergeUniqueById = (items) => {
        const map = new Map();
        items.forEach((item) => {
            if (!item?.id) return;
            map.set(item.id, item);
        });
        return Array.from(map.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    };

    const loadMessages = async ({ cursor = null, prepend = false } = {}) => {
        if (prepend) setLoadingOlder(true);

        try {
            const beforeHeight = messageListRef.current?.scrollHeight || 0;
            const payload = await getMessages(id, { cursor, limit: 20 });
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

    const appendIncomingMessage = (incomingMessage) => {
        if (!incomingMessage?.id) return;
        setMessages((prev) => mergeUniqueById([...prev, incomingMessage]));
    };

    // Initial Load
    useEffect(() => {
        const fetchClassData = async () => {
            try {
                const data = await getClassDetails(id);
                setSwapClass(data);
                if (data) {
                    // Load review data if class is completed
                    if (data.status === 'COMPLETED') {
                        try {
                            const [reviewStatus, reviews] = await Promise.all([
                                hasReviewedClass(Number(id)),
                                getClassReviews(Number(id))
                            ]);
                            setMyReviewStatus(reviewStatus);
                            setClassReviews(reviews || []);
                        } catch (_) {}
                    }

                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load classroom");
            } finally {
                setLoading(false);
            }
        };
        fetchClassData();
    }, [id]);

    useEffect(() => {
        setLoadingMessages(true);
        setMessages([]);
        setMessagesMeta({ hasMore: false, nextCursor: null, total: 0 });
        clearChatUnread(id);
        loadMessages({ cursor: null, prepend: false });
    }, [id, clearChatUnread]);

    // Always join room when socket connects/reconnects.
    useEffect(() => {
        if (!socket) return;

        const joinRoom = () => {
            socket.emit('join_chat', id);
        };

        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);
        return () => {
            socket.off('connect', joinRoom);
        };
    }, [socket, id]);

    useEffect(() => {
        if (socket && swapClass) {
            socket.emit('join_chat', id);
        }
    }, [socket, swapClass, id]);

    // Listen for new messages via shared socket
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

        socket.on('receive_message', handleNewMessage);
        socket.on('error', handleSocketError);

        // Typing indicator listeners
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
        // Read receipts listener
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

        socket.on('user_typing', handleUserTyping);
        socket.on('typing', handleUserTyping);
        socket.on('user_stop_typing', handleUserStopTyping);
        socket.on('stopTyping', handleUserStopTyping);
        socket.on('messages_read', handleMessagesRead);
        socket.on('messages_delivered', handleMessagesDelivered);
        socket.on('chat_presence', handlePresence);

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
        };
    }, [socket, id, swapClass, user?.userId]);

    useEffect(() => {
        // Auto-scroll on new messages
        if (messages.length > 0 && !loadingOlder) {
             chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        // Mark messages as read when new messages arrive
        if (socket && messages.length > 0) {
            socket.emit('mark_read', id);
            clearChatUnread(id);
        }
    }, [messages.length, socket, id, clearChatUnread, loadingOlder]);

    useEffect(() => {
        const handle = () => {
            if (document.visibilityState === 'visible' && socket) {
                socket.emit('mark_read', id);
                clearChatUnread(id);
            }
        };
        document.addEventListener('visibilitychange', handle);
        return () => document.removeEventListener('visibilitychange', handle);
    }, [socket, id, clearChatUnread]);

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (socket && !emittedTypingRef.current) {
            socket.emit('typing', id);
            emittedTypingRef.current = true;
        }
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (socket) socket.emit('stopTyping', id);
            emittedTypingRef.current = false;
        }, 2000);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;
        // Stop typing indicator on send
        if (socket) socket.emit('stopTyping', id);
        emittedTypingRef.current = false;
        clearTimeout(typingTimeoutRef.current);

        try {
            setSendingMessage(true);
            let created;
            if (selectedFile) {
                created = await sendAttachmentMessage(id, selectedFile, newMessage.trim());
            } else {
                created = await sendMessage(id, newMessage.trim());
            }

            appendIncomingMessage(created);
            setNewMessage('');
            setSelectedFile(null);
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            toast.error(apiMessage || "Failed to send");
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
            const result = await searchMessages(id, trimmed, 100);
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
            const todo = await addClassTodo(id, { title });
            setSwapClass(prev => ({
                ...prev,
                todos: [...prev.todos, todo]
            }));
            toast.success("Todo added");
        } catch (error) {
            toast.error("Failed to add todo");
        }
    };

    const handleToggleTodo = async (todoId, currentStatus) => {
        try {
            await toggleTodo(todoId, !currentStatus);
            setSwapClass(prev => ({
                ...prev,
                todos: prev.todos.map(t => t.id === todoId ? { ...t, isCompleted: !currentStatus } : t)
            }));
        } catch (error) {
             toast.error("Failed to update todo");
        }
    };

    const handleCompleteClass = () => {
        setCompleteDialogOpen(true);
    };

    const handleConfirmComplete = async () => {
        setCompleteDialogOpen(false);
        try {
            await completeClass(id);
            toast.success("Class marked as complete!");
            // Refresh
            const data = await getClassDetails(id);
            setSwapClass(data);
            // Load reviews after completion
            if (data?.status === 'COMPLETED') {
                const [reviewStatus, reviews] = await Promise.all([
                    hasReviewedClass(Number(id)),
                    getClassReviews(Number(id))
                ]);
                setMyReviewStatus(reviewStatus);
                setClassReviews(reviews || []);
            }
        } catch (error) {
             toast.error("Error completing class");
        }
    };

    const handleSubmitReview = async () => {
        if (reviewRating < 1 || reviewRating > 5) {
            toast.error("Please select a rating (1-5 stars)");
            return;
        }
        setReviewSubmitting(true);
        try {
            const review = await createReview({
                swapClassId: Number(id),
                rating: reviewRating,
                comment: reviewComment || null
            });
            setMyReviewStatus({ hasReviewed: true, review });
            setClassReviews(prev => [review, ...prev]);
            toast.success("Review submitted! Thank you.");
            setReviewRating(0);
            setReviewComment('');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit review");
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading classroom...</div>;
    if (!swapClass) return <div className="p-8 text-center">Class not found.</div>;

    const isFinished = swapClass.status === 'COMPLETED';
    const fromUser = swapClass.swapRequest?.fromUser;
    const toUser = swapClass.swapRequest?.toUser;
    const partner = fromUser?.userId === user?.userId ? toUser : fromUser;
    const partnerInitial = (partner?.username || 'U').charAt(0).toUpperCase();
    const chatStatusText = partnerTyping ? 'Typing...' : partnerOnline ? 'Online' : 'Offline';

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
            {/* Dialogs */}
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

            {/* Left: Class Details & Todos */}
            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold">Classroom #{swapClass.id}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isFinished ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {swapClass.status}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <p className="text-gray-500">Teaching</p>
                            <p className="font-semibold">{swapClass.swapRequest.teachSkill?.skill.name || "TBD"}</p>
                        </div>
                         <div>
                            <p className="text-gray-500">Learning</p>
                            <p className="font-semibold">{swapClass.swapRequest.learnSkill.skill.name}</p>
                        </div>
                    </div>

                    {!isFinished && (
                        <div className="flex space-x-3">
                            <Button onClick={handleAddTodo} size="sm" variant="secondary">+ Add Task</Button>
                            <Button onClick={handleCompleteClass} size="sm" variant="primary">Mark Complete</Button>
                        </div>
                    )}
                </div>

                {/* Todos */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-lg mb-4">Action Items</h3>
                    {(!swapClass.todos || swapClass.todos.length === 0) && <p className="text-gray-400 text-sm">No tasks yet.</p>}
                    <ul className="space-y-2">
                        {(swapClass.todos || []).map(todo => (
                            <li key={todo.id} className="flex items-center space-x-3">
                                <input 
                                    type="checkbox" 
                                    checked={todo.isCompleted} 
                                    onChange={() => handleToggleTodo(todo.id, todo.isCompleted)}
                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    disabled={isFinished}
                                />
                                <span className={todo.isCompleted ? "line-through text-gray-400" : ""}>{todo.title}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Review Section — shown when class is completed */}
                {isFinished && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="font-semibold text-lg mb-4">Reviews</h3>

                        {/* Submit review form (if not yet reviewed) */}
                        {!myReviewStatus.hasReviewed ? (
                            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm font-medium text-yellow-800 mb-3">How was your experience? Leave a review for your partner.</p>
                                <div className="flex items-center gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewRating(star)}
                                            onMouseEnter={() => setReviewHover(star)}
                                            onMouseLeave={() => setReviewHover(0)}
                                            className="focus:outline-none"
                                        >
                                            <Star
                                                className={`h-7 w-7 transition-colors ${
                                                    star <= (reviewHover || reviewRating)
                                                        ? 'text-yellow-400 fill-yellow-400'
                                                        : 'text-gray-300'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                    <span className="ml-2 text-sm text-gray-600">
                                        {reviewRating > 0 ? `${reviewRating}/5` : 'Select rating'}
                                    </span>
                                </div>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Write your feedback (optional)..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                                    rows={3}
                                />
                                <Button
                                    size="sm"
                                    onClick={handleSubmitReview}
                                    disabled={reviewSubmitting || reviewRating === 0}
                                >
                                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                                </Button>
                            </div>
                        ) : (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                                You've already reviewed this class ({myReviewStatus.review?.rating}/5 stars).
                            </div>
                        )}

                        {/* Existing reviews */}
                        {classReviews.length > 0 ? (
                            <div className="space-y-3">
                                {classReviews.map((r) => (
                                    <div key={r.id} className="border border-gray-200 rounded p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-sm">{r.reviewer?.username}</span>
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star
                                                        key={s}
                                                        className={`h-4 w-4 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                                        <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">No reviews yet.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Chat */}
            <div className="w-full md:w-108 flex flex-col rounded-2xl border border-white/10 bg-[#0A0F14] h-full overflow-hidden">
                <div className="border-b border-white/10 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A4D9F]/30 text-[#DCE7F5] font-semibold">
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
                    className="flex-1 overflow-y-auto px-3 py-3 bg-[#0A0F14]"
                >
                    {loadingMessages ? (
                        <p className="text-center text-sm text-[#8DA0BF] py-4">Loading messages...</p>
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
                                                <div className={`h-7 w-7 rounded-full bg-[#111721] text-[#DCE7F5] text-xs font-semibold flex items-center justify-center ${grouped ? 'invisible' : ''}`}>
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

                <div className="border-t border-white/10 p-3 space-y-2 bg-[#0F1622]">
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
    );
};

export default SwapClassroom;
