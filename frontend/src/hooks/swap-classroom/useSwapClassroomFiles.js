import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { uploadClassroomFile as uploadClassroomFileApi, deleteClassroomFile as deleteClassroomFileApi } from '../services/classroom.service';
import { isPreviewableFile } from '../components/classroom/classroomUtils';

export const useSwapClassroomFiles = (classId) => {
    const [classroomFiles, setClassroomFiles] = useState([]);
    const [uploadingClassroomFile, setUploadingClassroomFile] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    // Upload file
    const handleUploadClassroomFile = useCallback(async (event) => {
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
    }, [classId]);

    // Delete file
    const handleDeleteClassroomFile = useCallback(async (fileId) => {
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
    }, [classId, previewFile?.id]);

    // Preview file
    const handlePreviewClassroomFile = useCallback((file) => {
        if (!isPreviewableFile(file?.fileName)) {
            toast('Preview is not available for this file type. You can still download it.');
            return;
        }
        setPreviewFile(file);
    }, []);

    return {
        // State
        classroomFiles,
        uploadingClassroomFile,
        previewFile,
        // Setters
        setClassroomFiles,
        setUploadingClassroomFile,
        setPreviewFile,
        // Handlers
        handleUploadClassroomFile,
        handleDeleteClassroomFile,
        handlePreviewClassroomFile
    };
};
