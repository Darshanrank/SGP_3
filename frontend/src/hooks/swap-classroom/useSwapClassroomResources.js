import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { addPinnedResource as addPinnedResourceApi, deletePinnedResource as deletePinnedResourceApi, sendMessage } from '../services/classroom.service';

export const useSwapClassroomResources = (classId) => {
    const [resources, setResources] = useState([]);
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceUrl, setResourceUrl] = useState('');
    const [savingResource, setSavingResource] = useState(false);

    // Add pinned resource
    const handleAddResource = useCallback(async (event) => {
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
    }, [classId, resourceTitle, resourceUrl]);

    // Delete resource
    const handleDeleteResource = useCallback(async (resourceId) => {
        try {
            await deletePinnedResourceApi(classId, resourceId);
            setResources((prev) => prev.filter((item) => item.id !== resourceId));
            toast.success('Resource removed');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to remove resource');
        }
    }, [classId]);

    return {
        // State
        resources,
        resourceTitle,
        resourceUrl,
        savingResource,
        // Setters
        setResources,
        setResourceTitle,
        setResourceUrl,
        setSavingResource,
        // Handlers
        handleAddResource,
        handleDeleteResource
    };
};
