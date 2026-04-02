import ConfirmDialog from '../ui/ConfirmDialog';
import InputDialog from '../ui/InputDialog';
import { Button } from '../ui/Button';
import { ExternalLink, Play, X } from 'lucide-react';

const SwapsModals = ({
    videoPreview,
    setVideoPreview,
    reportModal,
    setReportModal,
    reportReason,
    setReportReason,
    reportReasons,
    reportDescription,
    setReportDescription,
    safetyBusy,
    onSubmitReport,
    confirmDialog,
    setConfirmDialog,
    handleConfirmAction,
    blockConfirm,
    setBlockConfirm,
    handleConfirmBlock,
    cancelDialog,
    closeCancelDialog,
    handleCancelWithReason
}) => {
    return (
        <>
            {videoPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setVideoPreview(null)}>
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111721] shadow-[0_16px_40px_rgba(0,0,0,0.55)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <h3 className="font-semibold text-[#DCE7F5]">{videoPreview.skillName} - Preview</h3>
                            <button onClick={() => setVideoPreview(null)} className="rounded-full p-1 transition-colors hover:bg-[#151D27]">
                                <X className="h-5 w-5 text-[#8DA0BF]" />
                            </button>
                        </div>
                        <div className="space-y-4 p-4">
                            {videoPreview.videoUrl ? (
                                <div>
                                    <p className="mb-2 text-xs font-medium text-[#8DA0BF]">Demo Video</p>
                                    <video src={videoPreview.videoUrl} controls className="w-full rounded-lg border border-white/10" />
                                </div>
                            ) : (
                                <div className="rounded-lg bg-[#0E1620] py-8 text-center">
                                    <Play className="mx-auto mb-2 h-10 w-10 text-[#6F83A3]" />
                                    <p className="text-sm text-[#8DA0BF]">No demo video available</p>
                                </div>
                            )}
                            {videoPreview.proofUrl && (
                                <a href={videoPreview.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-[#7BB2FF] transition-colors hover:text-[#9fc8ff]">
                                    <ExternalLink className="h-4 w-4" />
                                    View Proof / Portfolio Link
                                </a>
                            )}
                            {!videoPreview.videoUrl && !videoPreview.proofUrl && (
                                <p className="text-center text-sm text-[#8DA0BF]">No preview content available for this skill.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {reportModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReportModal({ open: false, userId: null, username: '' })}>
                    <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#111721] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#DCE7F5]">Report @{reportModal.username}</h3>
                        <p className="mt-1 text-sm text-[#8DA0BF]">This report is sent to admins for review.</p>
                        <div className="mt-4 space-y-3">
                            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]">
                                {reportReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                            </select>
                            <textarea
                                value={reportDescription}
                                onChange={(e) => setReportDescription(e.target.value)}
                                placeholder="Optional details"
                                rows={4}
                                className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setReportModal({ open: false, userId: null, username: '' })} disabled={safetyBusy}>Cancel</Button>
                            <Button size="sm" variant="danger" disabled={safetyBusy || !reportModal.userId} onClick={onSubmitReport}>Submit Report</Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.action === 'ACCEPTED' ? 'Accept' : 'Reject'}
                variant={confirmDialog.action === 'ACCEPTED' ? 'primary' : 'danger'}
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmDialog({ open: false, requestId: null, action: '', title: '', message: '' })}
            />

            <ConfirmDialog
                open={blockConfirm.open}
                title="Block this user?"
                message="You will no longer receive swap requests or messages from this user."
                confirmLabel="Confirm Block"
                variant="danger"
                confirmDisabled={safetyBusy}
                onConfirm={handleConfirmBlock}
                onCancel={() => setBlockConfirm({ open: false, userId: null, username: '' })}
            />

            <InputDialog
                open={cancelDialog.open}
                title={`Cancel request to @${cancelDialog.targetUsername}`}
                placeholder="Enter cancellation reason (min 5 characters)"
                submitLabel="Cancel Request"
                onSubmit={handleCancelWithReason}
                onCancel={closeCancelDialog}
            />
        </>
    );
};

export default SwapsModals;
