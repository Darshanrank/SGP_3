import { Video, VideoOff, Mic, MicOff, MonitorUp, PhoneOff } from 'lucide-react';

const ClassroomCallOverlay = ({
    isInCall,
    swapClassId,
    sessionDurationText,
    remoteVideoRef,
    waitingForPartnerInCall,
    partnerUsername,
    localVideoRef,
    cameraEnabled,
    micEnabled,
    onToggleCamera,
    onToggleMic,
    onToggleScreenShare,
    onEndCall
}) => {
    if (!isInCall) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/85 p-4">
            <div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-2xl border border-white/10 bg-[#0A0F14] p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <p className="text-base font-semibold text-[#E6EEF8]">Classroom #{swapClassId}</p>
                        <p className="text-xs text-[#8DA0BF]">{sessionDurationText}</p>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-300">Live Call</span>
                </div>

                <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111721]">
                        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                        {waitingForPartnerInCall && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0A0F14]/80 px-4 text-center">
                                <p className="text-sm text-[#DCE7F5]">Waiting for {partnerUsername || 'partner'} to join...</p>
                            </div>
                        )}
                        <p className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">{partnerUsername || 'Partner'}</p>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111721]">
                        <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                        <p className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">You</p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={onToggleCamera}
                        className="rounded-full border border-white/15 bg-[#111721] p-3 text-[#E6EEF8] hover:bg-[#1A2430]"
                        title="Toggle camera"
                    >
                        {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>
                    <button
                        type="button"
                        onClick={onToggleMic}
                        className="rounded-full border border-white/15 bg-[#111721] p-3 text-[#E6EEF8] hover:bg-[#1A2430]"
                        title="Toggle microphone"
                    >
                        {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                    <button
                        type="button"
                        onClick={onToggleScreenShare}
                        className="rounded-full border border-white/15 bg-[#111721] p-3 text-[#E6EEF8] hover:bg-[#1A2430]"
                        title="Screen share"
                    >
                        <MonitorUp className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={onEndCall}
                        className="rounded-full bg-red-500 p-3 text-white hover:bg-red-600"
                        title="End call"
                    >
                        <PhoneOff className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClassroomCallOverlay;
