import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { rtcConfiguration } from '../components/classroom/classroomUtils';

export const useSwapClassroomCall = (classId, socket, user) => {
    const [isInCall, setIsInCall] = useState(false);
    const [callParticipantIds, setCallParticipantIds] = useState([]);
    const [callStarting, setCallStarting] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const sentOfferRef = useRef(false);
    const screenTrackRef = useRef(null);

    // Ensure local media is available
    const ensureLocalMedia = useCallback(async () => {
        if (localStreamRef.current) {
            const activeTracks = localStreamRef.current.getTracks();
            if (activeTracks.length > 0) {
                return localStreamRef.current;
            }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        localStreamRef.current = stream;
        return stream;
    }, []);

    // Create peer connection
    const createPeerConnection = useCallback((targetUserId) => {
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
    }, [classId, socket]);

    // Cleanup call resources
    const cleanupCallResources = useCallback(({ notifyServer = true, incrementSession = false } = {}) => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                track.stop();
            });
            localStreamRef.current = null;
        }

        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach((track) => {
                track.stop();
            });
            remoteStreamRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
        }

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        setCameraEnabled(true);
        setMicEnabled(true);
        setScreenSharing(false);
        sentOfferRef.current = false;

        if (notifyServer && socket) {
            socket.emit('classroom_call_end', classId);
        }
    }, [classId, socket]);

    // Start call
    const handleStartCall = useCallback(async (partnerId) => {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast.error('Your browser does not support video calls');
            return;
        }

        if (!partnerId) {
            toast.error('Partner is unavailable for this class');
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
    }, [classId, socket, ensureLocalMedia, cleanupCallResources]);

    // End call
    const handleEndCall = useCallback(() => {
        setIsInCall(false);
        cleanupCallResources({ notifyServer: true, incrementSession: true });
    }, [cleanupCallResources]);

    // Toggle camera
    const toggleCamera = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const next = !cameraEnabled;
        stream.getVideoTracks().forEach((track) => {
            track.enabled = next;
        });
        setCameraEnabled(next);
    }, [cameraEnabled]);

    // Toggle microphone
    const toggleMic = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const next = !micEnabled;
        stream.getAudioTracks().forEach((track) => {
            track.enabled = next;
        });
        setMicEnabled(next);
    }, [micEnabled]);

    // Toggle screen share
    const toggleScreenShare = useCallback(async () => {
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
    }, [screenSharing]);

    return {
        // State
        isInCall,
        callParticipantIds,
        callStarting,
        cameraEnabled,
        micEnabled,
        screenSharing,
        // Refs
        localVideoRef,
        remoteVideoRef,
        localStreamRef,
        remoteStreamRef,
        peerConnectionRef,
        sentOfferRef,
        screenTrackRef,
        // Setters
        setIsInCall,
        setCallParticipantIds,
        setCallStarting,
        setCameraEnabled,
        setMicEnabled,
        setScreenSharing,
        // Handlers
        ensureLocalMedia,
        createPeerConnection,
        cleanupCallResources,
        handleStartCall,
        handleEndCall,
        toggleCamera,
        toggleMic,
        toggleScreenShare
    };
};
