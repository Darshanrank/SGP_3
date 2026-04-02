import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

export const useSwapClassroomWhiteboard = (classId, socket) => {
    const [whiteboardOpen, setWhiteboardOpen] = useState(false);

    const excalidrawApiRef = useRef(null);
    const whiteboardSceneRef = useRef(null);
    const whiteboardBroadcastTimeoutRef = useRef(null);
    const isApplyingRemoteWhiteboardRef = useRef(false);

    // Handle local whiteboard changes
    const handleWhiteboardSceneChange = useCallback((elements, appState, files) => {
        const scene = {
            elements,
            appState,
            files
        };

        whiteboardSceneRef.current = scene;
        if (!socket || isApplyingRemoteWhiteboardRef.current) return;

        clearTimeout(whiteboardBroadcastTimeoutRef.current);
        whiteboardBroadcastTimeoutRef.current = setTimeout(() => {
            socket.emit('whiteboard_scene_update', {
                classId,
                scene
            });
        }, 250);
    }, [classId, socket]);

    // Clear whiteboard
    const handleClearWhiteboard = useCallback(() => {
        if (!excalidrawApiRef.current) return;
        excalidrawApiRef.current.resetScene();
    }, []);

    // Export whiteboard as image
    const handleExportWhiteboard = useCallback(async () => {
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
            const a = document.createElement('a');
            a.href = url;
            a.download = `whiteboard-${new Date().getTime()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Whiteboard exported');
        } catch (error) {
            toast.error('Failed to export whiteboard');
        }
    }, []);

    return {
        // State
        whiteboardOpen,
        // Refs
        excalidrawApiRef,
        whiteboardSceneRef,
        whiteboardBroadcastTimeoutRef,
        isApplyingRemoteWhiteboardRef,
        // Setters
        setWhiteboardOpen,
        // Handlers
        handleWhiteboardSceneChange,
        handleClearWhiteboard,
        handleExportWhiteboard
    };
};
