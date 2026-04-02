import { Download, Eye, Upload } from 'lucide-react';

const ClassroomFilesPanel = ({
    classroomFileInputRef,
    handleUploadClassroomFile,
    uploadingClassroomFile,
    classroomFiles,
    getFileIcon,
    isPreviewableFile,
    toDateTime,
    handlePreviewClassroomFile,
    handleDeleteClassroomFile
}) => (
    <>
        <input
            ref={classroomFileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleUploadClassroomFile}
        />
        <div className="mb-4">
            <button
                type="button"
                disabled={uploadingClassroomFile}
                onClick={() => classroomFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm text-[#E6EEF8] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Upload className="h-4 w-4" />
                {uploadingClassroomFile ? 'Uploading...' : 'Upload File'}
            </button>
        </div>

        <div className="space-y-2">
            {classroomFiles.length === 0 && (
                <p className="text-sm text-[#8DA0BF]">No files shared yet.</p>
            )}
            {classroomFiles.map((file) => {
                const FileIcon = getFileIcon(file.fileName);
                const canPreview = isPreviewableFile(file.fileName);

                return (
                    <div
                        key={file.id}
                        className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-4 py-3 transition hover:border-blue-500"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <FileIcon className="h-4 w-4 shrink-0 text-[#7BB2FF]" />
                                <p className="truncate text-sm font-medium text-[#E6EEF8]">{file.fileName}</p>
                            </div>
                            <p className="mt-1 text-xs text-[#8DA0BF]">
                                Uploaded {toDateTime(file.createdAt)} by {file.uploader?.username || 'User'}
                            </p>
                        </div>

                        <div className="ml-3 flex shrink-0 items-center gap-2">
                            <a
                                href={file.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs text-[#E6EEF8] transition hover:bg-white/5"
                            >
                                <Download className="h-3 w-3" />
                                Download
                            </a>
                            <button
                                type="button"
                                onClick={() => handlePreviewClassroomFile(file)}
                                disabled={!canPreview}
                                className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs text-[#E6EEF8] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Eye className="h-3 w-3" />
                                Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteClassroomFile(file.id)}
                                className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/10"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    </>
);

export default ClassroomFilesPanel;
