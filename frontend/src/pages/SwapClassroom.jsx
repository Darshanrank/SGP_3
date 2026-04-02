import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    deleteClassroomFile as deleteClassroomFileApi,
    getSharedNote as getSharedNoteApi,
    updateSharedNote as updateSharedNoteApi,
    getMessages,
    sendMessage,
    sendAttachmentMessage,
    searchMessages,
    createReview,
    getClassReviews,
    hasReviewedClass,
    markReviewHelpful
} from '../services/classroom.service';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Button } from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import {
    ClassroomLoadingState,
    ClassroomNotFoundState,
    PanelSection,
    ClassroomCallOverlay,
    ClassroomFilePreviewModal,
    ClassroomChatDrawer,
    ClassroomTasksPanel,
    ClassroomNotesPanel,
    getNotesPanelStatusText,
    ClassroomSnippetsPanel,
    ClassroomFilesPanel,
    ClassroomResourcesPanel,
    ClassroomReviewsPanel
} from '../components/classroom';
import { useClassroomDerivedState } from '../hooks/useClassroomDerivedState';
import {
    codeBlockClass,
    chatReactionEmojiOptions,
    rtcConfiguration,
    renderHighlightedCodeLine,
    toDateTime,
    getFileType,
    isPreviewableFile,
    getFileIcon,
    REVIEW_CATEGORY_CONFIG,
    getEmptyCategoryRatings,
    computeOverallFromCategories
} from '../components/classroom/classroomUtils';
import {
    Pin,
    Code2,
    FileText,
    StickyNote,
    Star,
    ListChecks,
    CalendarDays,
    CheckCircle2,
    NotebookText,
    FolderOpen,
    MessageCircle,
} from 'lucide-react';

const WhiteboardModal = lazy(() => import('../components/classroom/WhiteboardModal'));

const sanitizeWhiteboardScene = (scene) => {
    if (!scene || typeof scene !== 'object') {
        return {
            elements: [],
            appState: {},
            files: {}
        };
    }

    const safeElements = Array.isArray(scene.elements) ? scene.elements : [];
    const safeFiles = scene.files && typeof scene.files === 'object' ? scene.files : {};
    const appState = scene.appState && typeof scene.appState === 'object' ? scene.appState : {};

    // Only keep serializable, stable app state fields.
    const safeAppState = {
        viewBackgroundColor: appState.viewBackgroundColor,
        theme: appState.theme,
        gridSize: appState.gridSize,
        zenModeEnabled: appState.zenModeEnabled
    };

    return {
        elements: safeElements,
        appState: safeAppState,
        files: safeFiles
    };
};

const SwapClassroom = () => {
    const navigate = useNavigate();
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
    const [onlineParticipantIds, setOnlineParticipantIds] = useState([]);
    const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);
    const [messageReactions, setMessageReactions] = useState({});
    const [myReactionByMessage, setMyReactionByMessage] = useState({});
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskAssignedTo, setTaskAssignedTo] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [savingTask, setSavingTask] = useState(false);

    const [whiteboardOpen, setWhiteboardOpen] = useState(false);

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
    const [previewFile, setPreviewFile] = useState(null);

    const [sharedNote, setSharedNote] = useState('');
    const [sharedNoteLoaded, setSharedNoteLoaded] = useState(false);
    const [sharedNoteDirty, setSharedNoteDirty] = useState(false);
    const [savingSharedNote, setSavingSharedNote] = useState(false);
    const [sharedNoteUpdatedAt, setSharedNoteUpdatedAt] = useState(null);
    const [noteVersionHistory, setNoteVersionHistory] = useState([]);
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    const [editingSnippetId, setEditingSnippetId] = useState(null);
    const [editSnippetTitle, setEditSnippetTitle] = useState('');
    const [editSnippetLanguage, setEditSnippetLanguage] = useState('javascript');
    const [editSnippetCode, setEditSnippetCode] = useState('');
    const [savingSnippetEdit, setSavingSnippetEdit] = useState(false);

    const [collapsedPanels, setCollapsedPanels] = useState({
        classroom: false,
        whiteboard: false,
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
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

    // Typing indicator state
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
    const [isInCall, setIsInCall] = useState(false);
    const [callParticipantIds, setCallParticipantIds] = useState([]);
    const [callStarting, setCallStarting] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);

    const messageListRef = useRef(null);
    const fileInputRef = useRef(null);
    const classroomFileInputRef = useRef(null);
    const chatEndRef = useRef(null);
    const messageRefs = useRef({});
    const typingTimeoutRef = useRef(null);
    const emittedTypingRef = useRef(false);
    const noteBroadcastTimeoutRef = useRef(null);
    const whiteboardBroadcastTimeoutRef = useRef(null);
    const isApplyingRemoteWhiteboardRef = useRef(false);
    const excalidrawApiRef = useRef(null);
    const whiteboardSceneRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const sentOfferRef = useRef(false);
    const screenTrackRef = useRef(null);

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

    const applyReactionChange = (prevState, messageId, emoji, previousEmoji) => {
        const reactionMap = { ...(prevState[messageId] || {}) };

        if (previousEmoji && reactionMap[previousEmoji]) {
            reactionMap[previousEmoji] = Math.max(0, reactionMap[previousEmoji] - 1);
            if (reactionMap[previousEmoji] === 0) {
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
    };

    const getPartnerUserId = () => {
        const fromUserId = swapClass?.swapRequest?.fromUserId;
        const toUserId = swapClass?.swapRequest?.toUserId;
        if (!Number.isInteger(fromUserId) || !Number.isInteger(toUserId) || !Number.isInteger(user?.userId)) {
            return null;
        }
        return fromUserId === user.userId ? toUserId : fromUserId;
    };

    const cleanupCallResources = ({ notifyServer = true, incrementSession = false } = {}) => {
        if (notifyServer && socket) {
            socket.emit('classroom_call_leave', classId);
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.onicecandidate = null;
            peerConnectionRef.current.ontrack = null;
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach((track) => track.stop());
            remoteStreamRef.current = null;
        }

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        sentOfferRef.current = false;
        screenTrackRef.current = null;
        setCallParticipantIds([]);
        setScreenSharing(false);
        setCameraEnabled(true);
        setMicEnabled(true);
        setIsInCall(false);

        if (incrementSession) {
            setSwapClass((prev) => {
                if (!prev) return prev;
                const currentCount = Number(prev.sessionCount || prev.totalSessions || 0);
                return {
                    ...prev,
                    sessionCount: currentCount + 1
                };
            });
        }
    };

    const ensureLocalMedia = async () => {
        if (localStreamRef.current) return localStreamRef.current;
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
        return stream;
    };

    const createPeerConnection = (targetUserId) => {
        const pc = new RTCPeerConnection(rtcConfiguration);
        peerConnectionRef.current = pc;

        pc.onicecandidate = (event) => {
            if (!event.candidate || !socket || !targetUserId) return;
            socket.emit('classroom_call_ice_candidate', {
                classId,
                toUserId: targetUserId,
                candidate: event.candidate
            });
        };

        pc.ontrack = (event) => {
            if (!remoteStreamRef.current) {
                remoteStreamRef.current = new MediaStream();
            }
            remoteStreamRef.current.addTrack(event.track);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStreamRef.current;
            }
        };

        return pc;
    };

    const handleStartCall = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast.error('Your browser does not support video calls');
            return;
        }

        const partnerId = getPartnerUserId();
        if (!partnerId) {
            toast.error('Partner is unavailable for this class');
            return;
        }

        if (!onlineParticipantIds.includes(user?.userId) || !onlineParticipantIds.includes(partnerId)) {
            toast.error('Both participants must be online to start call');
            return;
        }

        setCallStarting(true);
        try {
            await ensureLocalMedia();
            setIsInCall(true);
            socket?.emit('classroom_call_join', classId);
        } catch (error) {
            toast.error('Could not access camera/microphone');
            cleanupCallResources({ notifyServer: false });
        } finally {
            setCallStarting(false);
        }
    };

    const handleEndCall = () => {
        cleanupCallResources({ notifyServer: true, incrementSession: true });
    };

    const toggleCamera = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const next = !cameraEnabled;
        stream.getVideoTracks().forEach((track) => {
            track.enabled = next;
        });
        setCameraEnabled(next);
    };

    const toggleMic = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const next = !micEnabled;
        stream.getAudioTracks().forEach((track) => {
            track.enabled = next;
        });
        setMicEnabled(next);
    };

    const toggleScreenShare = async () => {
        try {
            const stream = localStreamRef.current;
            if (!stream || !peerConnectionRef.current) return;

            if (screenSharing) {
                const cameraTrack = stream.getVideoTracks()[0];
                const sender = peerConnectionRef.current.getSenders().find((item) => item.track?.kind === 'video');
                if (sender && cameraTrack) {
                    await sender.replaceTrack(cameraTrack);
                }
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                if (screenTrackRef.current) {
                    screenTrackRef.current.stop();
                    screenTrackRef.current = null;
                }
                setScreenSharing(false);
                return;
            }

            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const displayTrack = displayStream.getVideoTracks()[0];
            if (!displayTrack) return;
            const sender = peerConnectionRef.current.getSenders().find((item) => item.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(displayTrack);
            }
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = displayStream;
            }
            screenTrackRef.current = displayTrack;
            displayTrack.onended = async () => {
                const liveStream = localStreamRef.current;
                if (!liveStream || !peerConnectionRef.current) return;
                const cameraTrack = liveStream.getVideoTracks()[0];
                const videoSender = peerConnectionRef.current.getSenders().find((item) => item.track?.kind === 'video');
                if (videoSender && cameraTrack) {
                    await videoSender.replaceTrack(cameraTrack);
                }
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = liveStream;
                }
                screenTrackRef.current = null;
                setScreenSharing(false);
            };
            setScreenSharing(true);
        } catch (_) {
            toast.error('Could not start screen sharing');
        }
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
            saveNoteVersion(content);
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
            socket.emit('whiteboard_scene_request', { classId });
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
        if (!socket || !whiteboardOpen) return;
        socket.emit('whiteboard_scene_request', { classId });
    }, [socket, classId, whiteboardOpen]);

    useEffect(() => {
        if (!socket || !isInCall) return;

        const rejoinCallRoom = () => {
            socket.emit('classroom_call_join', classId);
        };

        if (socket.connected) {
            rejoinCallRoom();
        }

        socket.on('connect', rejoinCallRoom);
        return () => {
            socket.off('connect', rejoinCallRoom);
        };
    }, [socket, classId, isInCall]);

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
            const normalizedUserIds = userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id));
            setOnlineParticipantIds(normalizedUserIds);
            const partnerId = swapClass.swapRequest.fromUserId === user?.userId
                ? swapClass.swapRequest.toUserId
                : swapClass.swapRequest.fromUserId;
            setPartnerOnline(normalizedUserIds.includes(partnerId));
        };

        const handleCallPresence = async ({ userIds = [] }) => {
            const normalizedUserIds = userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id));
            setCallParticipantIds(normalizedUserIds);

            const partnerId = getPartnerUserId();
            if (!partnerId || !isInCall || !localStreamRef.current) return;

            const bothInCall = normalizedUserIds.includes(user?.userId) && normalizedUserIds.includes(partnerId);
            if (!bothInCall) return;

            if (!peerConnectionRef.current) {
                const pc = createPeerConnection(partnerId);
                localStreamRef.current.getTracks().forEach((track) => {
                    pc.addTrack(track, localStreamRef.current);
                });
            }

            const shouldInitiate = Number(user?.userId) < Number(partnerId);
            if (!shouldInitiate || sentOfferRef.current) return;

            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            socket.emit('classroom_call_offer', {
                classId,
                toUserId: partnerId,
                sdp: offer
            });
            sentOfferRef.current = true;
        };

        const handleCallOffer = async ({ fromUserId, toUserId, sdp }) => {
            if (Number(toUserId) !== Number(user?.userId) || Number(fromUserId) === Number(user?.userId)) return;
            if (!sdp) return;

            if (!localStreamRef.current) {
                await ensureLocalMedia();
            }

            if (!peerConnectionRef.current) {
                const pc = createPeerConnection(Number(fromUserId));
                localStreamRef.current.getTracks().forEach((track) => {
                    pc.addTrack(track, localStreamRef.current);
                });
            }

            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);

            socket.emit('classroom_call_answer', {
                classId,
                toUserId: Number(fromUserId),
                sdp: answer
            });
        };

        const handleCallAnswer = async ({ fromUserId, toUserId, sdp }) => {
            if (Number(toUserId) !== Number(user?.userId) || Number(fromUserId) === Number(user?.userId)) return;
            if (!peerConnectionRef.current || !sdp) return;
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        };

        const handleIceCandidate = async ({ fromUserId, toUserId, candidate }) => {
            if (Number(toUserId) !== Number(user?.userId) || Number(fromUserId) === Number(user?.userId)) return;
            if (!peerConnectionRef.current || !candidate) return;
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
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
            saveNoteVersion(String(content || ''));
            setSharedNoteDirty(false);
            setSharedNoteUpdatedAt(updatedAt || new Date().toISOString());
        };

        const handleMessageReaction = ({ messageId, emoji, previousEmoji }) => {
            if (!Number.isInteger(Number(messageId))) return;
            if (!emoji && !previousEmoji) return;
            setMessageReactions((prev) => applyReactionChange(prev, Number(messageId), emoji, previousEmoji));
        };

        const handleWhiteboardSceneUpdated = ({ classId: updatedClassId, scene }) => {
            if (Number(updatedClassId) !== classId || !scene) return;
            const safeScene = sanitizeWhiteboardScene(scene);
            whiteboardSceneRef.current = safeScene;
            if (!excalidrawApiRef.current) return;

            isApplyingRemoteWhiteboardRef.current = true;
            excalidrawApiRef.current.updateScene(safeScene);
            requestAnimationFrame(() => {
                isApplyingRemoteWhiteboardRef.current = false;
            });
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
        socket.on('classroom_call_presence', handleCallPresence);
        socket.on('classroom_call_offer', handleCallOffer);
        socket.on('classroom_call_answer', handleCallAnswer);
        socket.on('classroom_call_ice_candidate', handleIceCandidate);
        socket.on('shared_note_updated', handleSharedNoteUpdated);
        socket.on('message_reaction', handleMessageReaction);
        socket.on('whiteboard_scene_updated', handleWhiteboardSceneUpdated);

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
            socket.off('classroom_call_presence', handleCallPresence);
            socket.off('classroom_call_offer', handleCallOffer);
            socket.off('classroom_call_answer', handleCallAnswer);
            socket.off('classroom_call_ice_candidate', handleIceCandidate);
            socket.off('shared_note_updated', handleSharedNoteUpdated);
            socket.off('message_reaction', handleMessageReaction);
            socket.off('whiteboard_scene_updated', handleWhiteboardSceneUpdated);
        };
    }, [socket, classId, swapClass, user?.userId, isInCall]);

    useEffect(() => {
        return () => {
            cleanupCallResources({ notifyServer: false, incrementSession: false });
        };
    }, [classId]);

    useEffect(() => {
        if (!isInCall) return;
        if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
    }, [isInCall]);

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

    const getMessageStatusText = (msg) => (msg.isRead ? '✓✓ Seen' : '✓ Sent');

    const formatMessageTimestamp = (value) => {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '--:--';
        return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleReactToMessage = (messageId, emoji) => {
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
    };

    const buildTaskDescription = (assignedUserId) => {
        if (!assignedUserId) return null;
        return `[ASSIGNEE:${assignedUserId}]`;
    };

    const parseTaskAssignedUserId = (description) => {
        const match = String(description || '').match(/\[ASSIGNEE:(\d+)\]/);
        if (!match?.[1]) return null;
        const parsed = Number(match[1]);
        return Number.isInteger(parsed) ? parsed : null;
    };

    const handleAddTodo = async (event) => {
        event.preventDefault();
        const title = taskTitle.trim();
        if (!title) {
            toast.error('Task title is required');
            return;
        }

        const assignedUserId = taskAssignedTo ? Number(taskAssignedTo) : null;
        const dueDateIso = taskDueDate ? new Date(`${taskDueDate}T09:00:00`).toISOString() : null;

        try {
            setSavingTask(true);
            const todo = await addClassTodo(classId, {
                title,
                dueDate: dueDateIso,
                description: buildTaskDescription(assignedUserId)
            });
            setSwapClass((prev) => ({
                ...prev,
                todos: [...(prev.todos || []), todo]
            }));
            setTaskTitle('');
            setTaskAssignedTo('');
            setTaskDueDate('');
            setShowTaskForm(false);
            toast.success('Task added');
        } catch (_) {
            toast.error('Failed to add task');
        } finally {
            setSavingTask(false);
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

    const handleDeleteClassroomFile = async (fileId) => {
        try {
            await deleteClassroomFileApi(classId, fileId);
            setClassroomFiles((prev) => prev.filter((item) => item.id !== fileId));
            if (previewFile?.id === fileId) {
                setPreviewFile(null);
            }
            toast.success('File deleted');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to delete file');
        }
    };

    const handlePreviewClassroomFile = (file) => {
        if (!isPreviewableFile(file?.fileName)) {
            toast('Preview is not available for this file type. You can still download it.');
            return;
        }
        setPreviewFile(file);
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

    const applyMarkdownFormat = (format) => {
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
    };

    const saveNoteVersion = (content) => {
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
    };

    const handleEditSnippet = (snippet) => {
        setEditingSnippetId(snippet.id);
        setEditSnippetTitle(snippet.title);
        setEditSnippetLanguage(snippet.language);
        setEditSnippetCode(snippet.code);
    };

    const handleSaveEditedSnippet = async () => {
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
    };

    const handleCancelEditSnippet = () => {
        setEditingSnippetId(null);
        setEditSnippetTitle('');
        setEditSnippetLanguage('javascript');
        setEditSnippetCode('');
    };

    const handleRestoreVersion = (version) => {
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
    };

    const handleWhiteboardSceneChange = (elements, appState, files) => {
        const scene = sanitizeWhiteboardScene({ elements, appState, files });

        whiteboardSceneRef.current = scene;
        if (!socket || isApplyingRemoteWhiteboardRef.current) return;

        clearTimeout(whiteboardBroadcastTimeoutRef.current);
        whiteboardBroadcastTimeoutRef.current = setTimeout(() => {
            socket.emit('whiteboard_scene_update', {
                classId,
                scene
            });
        }, 250);
    };

    const handleClearWhiteboard = () => {
        if (!excalidrawApiRef.current) return;
        excalidrawApiRef.current.resetScene();
    };

    const handleExportWhiteboard = async () => {
        if (!excalidrawApiRef.current) return;
        try {
            const { exportToBlob } = await import('@excalidraw/excalidraw');
            const blob = await exportToBlob({
                elements: excalidrawApiRef.current.getSceneElements(),
                appState: {
                    ...excalidrawApiRef.current.getAppState(),
                    exportBackground: true
                },
                files: excalidrawApiRef.current.getFiles(),
                mimeType: 'image/png'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `classroom-${classId}-whiteboard.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to export whiteboard image');
        }
    };

    const fromUser = swapClass?.swapRequest?.fromUser;
    const toUser = swapClass?.swapRequest?.toUser;
    const partner = fromUser?.userId === user?.userId ? toUser : fromUser;
    const classParticipants = [fromUser, toUser].filter(Boolean);
    const bothUsersOnline = classParticipants.length === 2
        && classParticipants.every((participant) => onlineParticipantIds.includes(Number(participant.userId)));
    const participantNameById = classParticipants.reduce((acc, participant) => {
        acc[participant.userId] = participant.username;
        return acc;
    }, {});
    const {
        totalTasks,
        completedTasks,
        taskProgress,
        sessionCount,
        notesEditCount,
        filesSharedCount,
        partnerInitial,
        chatStatusText,
        waitingForPartnerInCall,
        nextSessionText,
        sessionDurationText,
        draftOverallRating,
        mostHelpfulReview,
        previewFileType
    } = useClassroomDerivedState({
        swapClass,
        noteVersionHistory,
        classroomFiles,
        partner,
        partnerTyping,
        partnerOnline,
        isInCall,
        callParticipantIds,
        getPartnerUserId,
        reviewRatings,
        classReviews,
        previewFile,
        getFileType
    });

    if (loading) return <ClassroomLoadingState />;
    if (!swapClass) return <ClassroomNotFoundState />;

    const isFinished = swapClass.status === 'COMPLETED';
    const teachSkillName = swapClass.swapRequest.teachSkill?.skill.name || 'TBD';
    const learnSkillName = swapClass.swapRequest.learnSkill?.skill.name || 'TBD';

    const Panel = ({ panelKey, title, icon, iconClass = 'text-[#7BB2FF]', actions, children }) => (
        <PanelSection
            panelKey={panelKey}
            collapsed={collapsedPanels[panelKey]}
            onToggle={togglePanel}
            title={title}
            icon={icon}
            iconClass={iconClass}
            actions={actions}
        >
            {children}
        </PanelSection>
    );

    return (
        <div className="bg-[#0A0F14]">
            <ConfirmDialog
                open={completeDialogOpen}
                title="Complete Class"
                message="Are you sure you want to mark this class as completed? This action cannot be undone."
                confirmLabel="Mark Complete"
                onConfirm={handleConfirmComplete}
                onCancel={() => setCompleteDialogOpen(false)}
            />

            <ClassroomCallOverlay
                isInCall={isInCall}
                swapClassId={swapClass.id}
                sessionDurationText={sessionDurationText}
                remoteVideoRef={remoteVideoRef}
                waitingForPartnerInCall={waitingForPartnerInCall}
                partnerUsername={partner?.username}
                localVideoRef={localVideoRef}
                cameraEnabled={cameraEnabled}
                micEnabled={micEnabled}
                onToggleCamera={toggleCamera}
                onToggleMic={toggleMic}
                onToggleScreenShare={toggleScreenShare}
                onEndCall={handleEndCall}
            />

            <ClassroomFilePreviewModal
                previewFile={previewFile}
                previewFileType={previewFileType}
                onClose={() => setPreviewFile(null)}
            />

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                    <Panel
                        panelKey="classroom"
                        title={`Classroom #${swapClass.id}`}
                        icon={StickyNote}
                        iconClass="text-blue-400"
                        actions={
                            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${isFinished ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                {swapClass.status}
                            </span>
                        }
                    >
                        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-slate-900 p-4 lg:flex-row lg:items-center">
                            <div>
                                <p className="text-xl font-semibold text-white">Classroom #{swapClass.id}</p>
                                <p className="mt-1 text-base font-semibold text-[#DCE7F5]">{teachSkillName} ⇄ {learnSkillName}</p>
                            </div>

                            <div className="flex flex-col gap-1 text-sm text-gray-400">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Next Session</p>
                                <p className="text-sm font-medium text-gray-200">{nextSessionText}</p>
                                <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">Duration</p>
                                <p className="text-sm font-medium text-gray-200">{sessionDurationText}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsChatDrawerOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white transition hover:bg-slate-700"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    Chat
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStartCall}
                                    disabled={!bothUsersOnline || callStarting}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {callStarting ? 'Starting...' : bothUsersOnline ? 'Join Call' : 'Waiting for participant...'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/calendar')}
                                    className="rounded-lg border border-white/20 px-4 py-2 text-white transition hover:bg-white/5"
                                >
                                    Schedule
                                </button>
                            </div>
                        </div>

                        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900 p-4">
                            <p className="mb-3 text-xs uppercase tracking-wide text-[#8DA0BF]">Participants</p>
                            <div className="space-y-2">
                                {classParticipants.map((participant) => {
                                    const participantOnline = onlineParticipantIds.includes(Number(participant.userId));
                                    return (
                                        <div key={participant.userId} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111721] px-3 py-2">
                                            <p className="text-sm font-medium text-[#E6EEF8]">
                                                {participant.username}
                                                {participant.userId === user?.userId ? ' (You)' : ''}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-[#DCE7F5]">
                                                <span className={`h-2 w-2 rounded-full ${participantOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                <span>{participantOnline ? 'Online' : 'Offline'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 text-center transition hover:border-blue-500">
                                <div className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-wide text-[#8DA0BF]">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    Sessions
                                </div>
                                <p className="text-2xl font-semibold text-[#E6EEF8]">{sessionCount}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 text-center transition hover:border-blue-500">
                                <div className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-wide text-[#8DA0BF]">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Tasks Done
                                </div>
                                <p className="text-2xl font-semibold text-[#E6EEF8]">{completedTasks}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 text-center transition hover:border-blue-500">
                                <div className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-wide text-[#8DA0BF]">
                                    <NotebookText className="h-3.5 w-3.5" />
                                    Notes Edits
                                </div>
                                <p className="text-2xl font-semibold text-[#E6EEF8]">{notesEditCount}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-slate-900 p-4 text-center transition hover:border-blue-500">
                                <div className="mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-wide text-[#8DA0BF]">
                                    <FolderOpen className="h-3.5 w-3.5" />
                                    Files
                                </div>
                                <p className="text-2xl font-semibold text-[#E6EEF8]">{filesSharedCount}</p>
                            </div>
                        </div>

                        {!isFinished && (
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Button onClick={handleCompleteClass} size="sm" variant="primary">Mark Complete</Button>
                            </div>
                        )}
                    </Panel>

                    <Panel
                        panelKey="whiteboard"
                        title="Whiteboard"
                        icon={StickyNote}
                        iconClass="text-purple-400"
                    >
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-5 transition hover:border-blue-500">
                            <div>
                                <p className="text-base font-semibold text-white">Shared Whiteboard</p>
                                <p className="mt-1 text-sm text-gray-400">Draw diagrams, explain concepts, and sketch ideas together.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setWhiteboardOpen(true)}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500"
                            >
                                Open Whiteboard
                            </button>
                        </div>
                    </Panel>

                    <Panel
                        panelKey="tasks"
                        title="Action Items"
                        icon={ListChecks}
                        iconClass="text-green-400"
                        actions={!isFinished ? (
                            <button
                                type="button"
                                onClick={() => setShowTaskForm((prev) => !prev)}
                                className="rounded-md border border-white/20 px-3 py-1 text-sm text-[#DCE7F5] transition hover:bg-white/5"
                            >
                                + Add Task
                            </button>
                        ) : null}
                    >
                        <ClassroomTasksPanel
                            isFinished={isFinished}
                            completedTasks={completedTasks}
                            totalTasks={totalTasks}
                            taskProgress={taskProgress}
                            showTaskForm={showTaskForm}
                            setShowTaskForm={setShowTaskForm}
                            handleAddTodo={handleAddTodo}
                            taskTitle={taskTitle}
                            setTaskTitle={setTaskTitle}
                            taskAssignedTo={taskAssignedTo}
                            setTaskAssignedTo={setTaskAssignedTo}
                            taskDueDate={taskDueDate}
                            setTaskDueDate={setTaskDueDate}
                            savingTask={savingTask}
                            classParticipants={classParticipants}
                            todos={swapClass.todos || []}
                            participantNameById={participantNameById}
                            parseTaskAssignedUserId={parseTaskAssignedUserId}
                            handleToggleTodo={handleToggleTodo}
                        />
                    </Panel>

                    <Panel
                        panelKey="notes"
                        title="Shared Notes"
                        icon={StickyNote}
                        iconClass="text-blue-400"
                        actions={
                            <span className="text-xs text-[#8DA0BF]">
                                {getNotesPanelStatusText({
                                    savingSharedNote,
                                    sharedNoteDirty,
                                    sharedNoteUpdatedAt,
                                    toDateTime
                                })}
                            </span>
                        }
                    >
                        <ClassroomNotesPanel
                            savingSharedNote={savingSharedNote}
                            sharedNoteDirty={sharedNoteDirty}
                            sharedNoteUpdatedAt={sharedNoteUpdatedAt}
                            toDateTime={toDateTime}
                            applyMarkdownFormat={applyMarkdownFormat}
                            saveNoteVersion={saveNoteVersion}
                            sharedNote={sharedNote}
                            setShowVersionHistory={setShowVersionHistory}
                            showVersionHistory={showVersionHistory}
                            noteVersionHistory={noteVersionHistory}
                            handleRestoreVersion={handleRestoreVersion}
                            handleSharedNoteChange={handleSharedNoteChange}
                            handleSharedNoteBlur={handleSharedNoteBlur}
                        />
                    </Panel>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Panel panelKey="snippets" title="Code Snippets" icon={Code2} iconClass="text-indigo-400">
                            <ClassroomSnippetsPanel
                                editingSnippetId={editingSnippetId}
                                editSnippetTitle={editSnippetTitle}
                                setEditSnippetTitle={setEditSnippetTitle}
                                editSnippetLanguage={editSnippetLanguage}
                                setEditSnippetLanguage={setEditSnippetLanguage}
                                editSnippetCode={editSnippetCode}
                                setEditSnippetCode={setEditSnippetCode}
                                handleCancelEditSnippet={handleCancelEditSnippet}
                                handleSaveEditedSnippet={handleSaveEditedSnippet}
                                savingSnippetEdit={savingSnippetEdit}
                                handleAddSnippet={handleAddSnippet}
                                snippetTitle={snippetTitle}
                                setSnippetTitle={setSnippetTitle}
                                snippetLanguage={snippetLanguage}
                                setSnippetLanguage={setSnippetLanguage}
                                snippetCode={snippetCode}
                                setSnippetCode={setSnippetCode}
                                savingSnippet={savingSnippet}
                                snippets={snippets}
                                handleCopySnippet={handleCopySnippet}
                                handleEditSnippet={handleEditSnippet}
                                handleShareSnippetInChat={handleShareSnippetInChat}
                                handleDeleteSnippet={handleDeleteSnippet}
                                codeBlockClass={codeBlockClass}
                                renderHighlightedCodeLine={renderHighlightedCodeLine}
                            />
                        </Panel>

                        <Panel
                            panelKey="files"
                            title="File History"
                            icon={FileText}
                            iconClass="text-purple-400"
                        >
                            <ClassroomFilesPanel
                                classroomFileInputRef={classroomFileInputRef}
                                handleUploadClassroomFile={handleUploadClassroomFile}
                                uploadingClassroomFile={uploadingClassroomFile}
                                classroomFiles={classroomFiles}
                                getFileIcon={getFileIcon}
                                isPreviewableFile={isPreviewableFile}
                                toDateTime={toDateTime}
                                handlePreviewClassroomFile={handlePreviewClassroomFile}
                                handleDeleteClassroomFile={handleDeleteClassroomFile}
                            />
                        </Panel>
                    </div>

                    <Panel panelKey="resources" title="Pinned Resources" icon={Pin} iconClass="text-cyan-400">
                        <ClassroomResourcesPanel
                            handleAddResource={handleAddResource}
                            resourceTitle={resourceTitle}
                            setResourceTitle={setResourceTitle}
                            resourceUrl={resourceUrl}
                            setResourceUrl={setResourceUrl}
                            savingResource={savingResource}
                            resources={resources}
                            handleDeleteResource={handleDeleteResource}
                        />
                    </Panel>

                    {isFinished && (
                        <Panel panelKey="reviews" title="Reviews" icon={Star} iconClass="text-yellow-400">
                            <ClassroomReviewsPanel
                                myReviewStatus={myReviewStatus}
                                REVIEW_CATEGORY_CONFIG={REVIEW_CATEGORY_CONFIG}
                                reviewRatings={reviewRatings}
                                setReviewRatings={setReviewRatings}
                                reviewHoverMap={reviewHoverMap}
                                setReviewHoverMap={setReviewHoverMap}
                                draftOverallRating={draftOverallRating}
                                reviewComment={reviewComment}
                                setReviewComment={setReviewComment}
                                handleSubmitReview={handleSubmitReview}
                                reviewSubmitting={reviewSubmitting}
                                classReviews={classReviews}
                                mostHelpfulReview={mostHelpfulReview}
                                handleHelpfulVote={handleHelpfulVote}
                            />
                        </Panel>
                    )}
            </div>

            <ClassroomChatDrawer
                isOpen={isChatDrawerOpen}
                onClose={() => setIsChatDrawerOpen(false)}
                partnerInitial={partnerInitial}
                partner={partner}
                partnerOnline={partnerOnline}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearch}
                searching={searching}
                searchResults={searchResults}
                activeSearchIndex={activeSearchIndex}
                jumpToSearchResult={jumpToSearchResult}
                messageListRef={messageListRef}
                onChatScroll={handleChatScroll}
                loadingMessages={loadingMessages}
                messagesMeta={messagesMeta}
                onLoadOlder={handleLoadOlder}
                loadingOlder={loadingOlder}
                messages={messages}
                messageRefs={messageRefs}
                userId={user.userId}
                isGroupedWithPrevious={isGroupedWithPrevious}
                setActiveReactionMessageId={setActiveReactionMessageId}
                activeReactionMessageId={activeReactionMessageId}
                chatReactionEmojiOptions={chatReactionEmojiOptions}
                myReactionByMessage={myReactionByMessage}
                onReactToMessage={handleReactToMessage}
                highlightedText={highlightedText}
                formatMessageTimestamp={formatMessageTimestamp}
                getMessageStatusText={getMessageStatusText}
                messageReactions={messageReactions}
                partnerTyping={partnerTyping}
                chatEndRef={chatEndRef}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                fileInputRef={fileInputRef}
                isFinished={isFinished}
                newMessage={newMessage}
                onInputChange={handleInputChange}
                sendingMessage={sendingMessage}
                onSendMessage={handleSendMessage}
            />

            {whiteboardOpen && (
                <Suspense
                    fallback={(
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                            <div className="rounded-lg border border-white/10 bg-[#111721] px-4 py-3 text-sm text-[#8DA0BF]">
                                Loading whiteboard...
                            </div>
                        </div>
                    )}
                >
                    <WhiteboardModal
                        initialData={whiteboardSceneRef.current}
                        onApiReady={(api) => {
                            excalidrawApiRef.current = api;
                        }}
                        onSceneChange={handleWhiteboardSceneChange}
                        onClear={handleClearWhiteboard}
                        onExport={handleExportWhiteboard}
                        onClose={() => setWhiteboardOpen(false)}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default SwapClassroom;
