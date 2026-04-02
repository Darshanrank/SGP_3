import { X } from 'lucide-react';

const ClassroomFilePreviewModal = ({ previewFile, previewFileType, onClose }) => {
    if (!previewFile) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-4xl rounded-xl border border-white/10 bg-[#111721] p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-[#E6EEF8]">Preview</p>
                        <p className="text-xs text-[#8DA0BF]">{previewFile.fileName}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-white/20 p-1.5 text-[#8DA0BF] transition hover:bg-white/5"
                        aria-label="Close preview"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="h-[65vh] overflow-hidden rounded-lg border border-white/10 bg-[#0A0F14]">
                    {previewFileType === 'image' && (
                        <img
                            src={previewFile.fileUrl}
                            alt={previewFile.fileName}
                            className="h-full w-full object-contain"
                        />
                    )}
                    {previewFileType === 'pdf' && (
                        <iframe
                            title={previewFile.fileName}
                            src={previewFile.fileUrl}
                            className="h-full w-full"
                        />
                    )}
                    {(previewFileType === 'text' || previewFileType === 'code') && (
                        <iframe
                            title={previewFile.fileName}
                            src={previewFile.fileUrl}
                            className="h-full w-full"
                        />
                    )}
                    {!previewFileType && (
                        <div className="flex h-full items-center justify-center text-sm text-[#8DA0BF]">
                            Preview is not available for this file type.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassroomFilePreviewModal;
