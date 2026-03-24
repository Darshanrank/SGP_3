import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getUserAvailability, createAvailabilitySlot, updateAvailabilitySlot, deleteAvailabilitySlot } from '../services/meta.service';
import { Button } from './ui/Button';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatSlotTime = (timeValue) => {
    if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) return timeValue || '';
    const [hours, minutes] = timeValue.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const AvailabilitySchedule = () => {
    const [availabilitySlots, setAvailabilitySlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSlotId, setEditingSlotId] = useState(null);
    const [formData, setFormData] = useState({
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC'
    });
    const [saving, setSaving] = useState(false);

    const fetchAvailability = async () => {
        try {
            const slots = await getUserAvailability();
            setAvailabilitySlots(slots);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to load availability');
        }
    };

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            await fetchAvailability();
            setLoading(false);
        };
        run();
    }, []);

    const handleAddSlot = () => {
        setEditingSlotId(null);
        setFormData({
            dayOfWeek: 'Monday',
            startTime: '09:00',
            endTime: '17:00',
            timezone: 'UTC'
        });
        setModalOpen(true);
    };

    const handleEditSlot = (slot) => {
        setEditingSlotId(slot.id);
        setFormData({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: slot.timezone || 'UTC'
        });
        setModalOpen(true);
    };

    const handleSaveSlot = async (e) => {
        e.preventDefault();
        if (formData.startTime >= formData.endTime) {
            toast.error('End time must be after start time');
            return;
        }

        setSaving(true);
        try {
            if (editingSlotId) {
                await updateAvailabilitySlot(editingSlotId, formData);
                toast.success('Availability slot updated');
            } else {
                await createAvailabilitySlot(formData);
                toast.success('Availability slot added');
            }
            setModalOpen(false);
            setEditingSlotId(null);
            await fetchAvailability();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to save availability slot');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        if (!confirm('Remove this availability slot?')) return;
        
        try {
            await deleteAvailabilitySlot(slotId);
            toast.success('Availability slot removed');
            await fetchAvailability();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to delete slot');
        }
    };

    if (loading) {
        return <div className="text-center text-[#8DA0BF]">Loading availability...</div>;
    }

    // Group slots by day
    const slotsByDay = DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day] = availabilitySlots.filter(slot => slot.dayOfWeek === day);
        return acc;
    }, {});

    return (
        <section className="section-card space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="section-title">Availability Schedule</h2>
                <Button size="sm" onClick={handleAddSlot}>+ Add Time Slot</Button>
            </div>

            <div className="space-y-3">
                {Object.entries(slotsByDay).map(([day, slots]) => (
                    <div key={day} className="rounded-lg border border-white/10 bg-[#0E1620] p-4">
                        <h3 className="mb-3 font-medium text-[#DCE7F5]">{day}</h3>
                        {slots.length > 0 ? (
                            <div className="space-y-2">
                                {slots.map((slot) => (
                                    <div key={slot.id} className="flex items-center justify-between rounded-lg bg-[#111721] p-3">
                                        <div>
                                            <p className="text-sm font-medium text-[#DCE7F5]">
                                                {formatSlotTime(slot.startTime)} - {formatSlotTime(slot.endTime)}
                                            </p>
                                            <p className="text-xs text-[#8DA0BF]">{slot.timezone || 'UTC'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleEditSlot(slot)}
                                                className="text-sm text-blue-400 hover:text-blue-300 transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSlot(slot.id)}
                                                className="text-sm text-red-400 hover:text-red-300 transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-[#6B7280]">No availability set</p>
                        )}
                    </div>
                ))}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalOpen(false)}>
                    <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#DCE7F5]">{editingSlotId ? 'Edit Time Slot' : 'Add Time Slot'}</h3>
                        <form onSubmit={handleSaveSlot} className="mt-4 space-y-3">
                            <div>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Day</label>
                                <select
                                    value={formData.dayOfWeek}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, dayOfWeek: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                >
                                    {DAYS_OF_WEEK.map((day) => (
                                        <option key={day} value={day}>
                                            {day}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Start Time</label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                                        className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">End Time</label>
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                                        className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Timezone</label>
                                <select
                                    value={formData.timezone}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                >
                                    <option value="UTC">UTC</option>
                                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                    <option value="America/New_York">America/New_York (EST)</option>
                                    <option value="Europe/London">Europe/London (GMT)</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                    <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : editingSlotId ? 'Save' : 'Save Slot'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default AvailabilitySchedule;
