import { useMemo } from 'react';
import { formatSessionWithPartnerTime } from '../utils/timezone';

const computeOverallFromCategories = (ratings) => {
    const values = Object.values(ratings || {}).map((value) => Number(value || 0));
    if (values.some((value) => value <= 0)) return 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
};

export const useClassroomDerivedState = ({
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
}) => {
    return useMemo(() => {
        const totalTasks = (swapClass?.todos || []).length;
        const completedTasks = (swapClass?.todos || []).filter((todo) => Boolean(todo.isCompleted)).length;
        const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const sessionCount = Number(
            swapClass?.sessionCount
            || swapClass?.totalSessions
            || (Array.isArray(swapClass?.sessions) ? swapClass.sessions.length : 1)
        );
        const notesEditCount = noteVersionHistory.length;
        const filesSharedCount = classroomFiles.length;
        const partnerInitial = (partner?.username || 'U').charAt(0).toUpperCase();
        const chatStatusText = partnerTyping ? 'Typing...' : partnerOnline ? 'Online' : 'Offline';
        const waitingForPartnerInCall = isInCall && !callParticipantIds.includes(Number(getPartnerUserId()));
        const nextSessionDate = swapClass?.startedAt ? new Date(swapClass.startedAt) : null;
        const hasValidNextSession = Boolean(nextSessionDate && !Number.isNaN(nextSessionDate.getTime()));
        const partnerTimeZone = partner?.profile?.timezone || null;
        const nextSessionText = hasValidNextSession
            ? formatSessionWithPartnerTime(nextSessionDate, partnerTimeZone)
            : 'Not scheduled';
        const classDurationMs = swapClass?.startedAt && swapClass?.endedAt
            ? new Date(swapClass.endedAt).getTime() - new Date(swapClass.startedAt).getTime()
            : Number.NaN;
        const durationMinutes = Number.isFinite(classDurationMs) && classDurationMs > 0
            ? Math.round(classDurationMs / 60000)
            : 45;
        const sessionDurationText = `${durationMinutes} minutes`;
        const draftOverallRating = computeOverallFromCategories(reviewRatings);
        const mostHelpfulReview = classReviews.length > 0
            ? [...classReviews].sort((a, b) => {
                if ((b.helpfulVotes || 0) !== (a.helpfulVotes || 0)) return (b.helpfulVotes || 0) - (a.helpfulVotes || 0);
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })[0]
            : null;
        const previewFileType = previewFile ? getFileType(previewFile.fileName) : null;

        return {
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
        };
    }, [
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
    ]);
};
