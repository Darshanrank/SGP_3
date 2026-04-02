import { useEffect, useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const WhiteboardModal = ({
    initialData,
    onApiReady,
    onSceneChange,
    onClear,
    onExport,
    onClose
}) => {
    const [api, setApi] = useState(null);
    const appliedInitialSceneRef = useRef(false);

    useEffect(() => {
        if (!api || !initialData || appliedInitialSceneRef.current) return;

        try {
            const safeScene = {
                elements: Array.isArray(initialData.elements) ? initialData.elements : [],
                appState: initialData.appState && typeof initialData.appState === 'object' ? initialData.appState : {},
                files: initialData.files && typeof initialData.files === 'object' ? initialData.files : {}
            };

            requestAnimationFrame(() => {
                try {
                    api.updateScene(safeScene);
                } catch {
                    api.updateScene({ elements: [], appState: {}, files: {} });
                }
            });

            appliedInitialSceneRef.current = true;
        } catch {
            try {
                api.updateScene({ elements: [], appState: {}, files: {} });
            } catch {}
            appliedInitialSceneRef.current = true;
        }
    }, [api, initialData]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="flex h-[85vh] w-[90%] flex-col overflow-hidden rounded-lg bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">Collaborative Whiteboard</p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClear}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                            Clear Board
                        </button>
                        <button
                            type="button"
                            onClick={onExport}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                            Export Image
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white transition hover:bg-slate-700"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="h-full w-full">
                    <Excalidraw
                        excalidrawAPI={(instance) => {
                            setApi(instance);
                            onApiReady?.(instance);
                        }}
                        onChange={onSceneChange}
                        theme="light"
                    />
                </div>
            </div>
        </div>
    );
};

export default WhiteboardModal;
