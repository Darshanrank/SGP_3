// src/pages/Calendar.jsx
import { useEffect, useState } from 'react';
import { getCalendarEvents, createCalendarEvent } from '../services/meta.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Link } from 'react-router-dom';

const Calendar = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', location: '' });

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                // For simplicity, we'll just list ongoing classes as "events"
                // A real calendar would integrate a library like react-big-calendar
                const data = await getCalendarEvents();
                const list = data?.data || data?.events || data || [];
                setEvents(list);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.startTime) return;
        setSaving(true);
        try {
            const created = await createCalendarEvent(form);
            setEvents((prev) => [created?.event || created || form, ...prev]);
            setForm({ title: '', description: '', startTime: '', endTime: '', location: '' });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="section-card text-center">Loading...</div>;

    return (
        <div className="page-shell">
            <h1 className="page-title">My Schedule</h1>

            <form onSubmit={handleSubmit} className="section-card space-y-4">
                <h2 className="section-title">Add Event</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                    <Input label="Start" type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                    <Input label="End" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
                <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Button type="submit" disabled={saving}>Create Event</Button>
            </form>
            
            <div className="section-card p-0! overflow-hidden">
                {events.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        No active classes scheduled.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {events.map(cls => (
                            <li key={cls.id} className="p-5 md:p-6 hover:bg-gray-50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-[17px] font-semibold text-gray-900">
                                            {cls.title || `Event #${cls.id}`}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {cls.startTime ? new Date(cls.startTime).toLocaleString() : 'No start'}
                                            {cls.endTime ? ` → ${new Date(cls.endTime).toLocaleString()}` : ''}
                                        </p>
                                        {cls.location && <p className="text-sm text-gray-500">Location: {cls.location}</p>}
                                        {cls.description && <p className="text-sm text-gray-600 mt-1">{cls.description}</p>}
                                    </div>
                                    {cls.swapId && (
                                        <Link to={`/swaps/${cls.swapId}`}>
                                            <Button size="sm">Enter Classroom</Button>
                                        </Link>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Calendar;
