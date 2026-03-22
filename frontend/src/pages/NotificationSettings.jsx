import { useEffect, useState } from 'react';
import {
    getNotificationPreferences,
    updateNotificationPreferences
} from '../services/meta.service';
import { Button } from '../components/ui/Button';
import { BellRing } from 'lucide-react';
import { toast } from 'react-hot-toast';

const NotificationSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [preferences, setPreferences] = useState({
        swapRequests: true,
        classReminders: true,
        chatMessages: true,
        partnerStatus: true,
        systemAlerts: true
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const prefs = await getNotificationPreferences();

            setPreferences((prev) => ({
                ...prev,
                ...prefs
            }));
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to load notification settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleTogglePreference = (key) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSavePreferences = async () => {
        try {
            setSaving(true);
            const updated = await updateNotificationPreferences(preferences);
            setPreferences((prev) => ({ ...prev, ...updated }));
            toast.success('Notification preferences saved');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to save notification preferences');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="section-card text-center">Loading...</div>;
    }

    return (
        <div className="page-shell">
            <h1 className="page-title">Notification Settings</h1>

            <section className="section-card">
                <div className="mb-4 flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-[#7BB2FF]" />
                    <h2 className="text-lg font-semibold text-[#DCE7F5]">In-App Notification Preferences</h2>
                </div>

                <div className="space-y-3">
                    {[
                        { key: 'swapRequests', label: 'Swap Requests' },
                        { key: 'classReminders', label: 'Class Reminders' },
                        { key: 'chatMessages', label: 'Chat Messages' },
                        { key: 'partnerStatus', label: 'Partner Online/Typing Status' },
                        { key: 'systemAlerts', label: 'System Notifications' }
                    ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between rounded-lg bg-[#151D27] px-4 py-3">
                            <span className="text-sm text-[#DCE7F5]">{item.label}</span>
                            <input
                                type="checkbox"
                                checked={Boolean(preferences[item.key])}
                                onChange={() => handleTogglePreference(item.key)}
                                className="h-4 w-4 rounded"
                            />
                        </label>
                    ))}
                </div>

                <div className="mt-4">
                    <Button size="sm" onClick={handleSavePreferences} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </div>
            </section>

        </div>
    );
};

export default NotificationSettings;
