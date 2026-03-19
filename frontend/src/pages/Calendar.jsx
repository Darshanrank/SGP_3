// src/pages/Calendar.jsx
import { useEffect, useState } from 'react';
import { getCalendarEvents, createCalendarEvent } from '../services/meta.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Link } from 'react-router-dom';

const normalizeEvent = (event) => ({
    ...event,
    startTime: event.startTime || event.eventDate || null,
    endTime: event.endTime || null,
    location: event.location || '',
    swapId: event.swapId || event.swapClassId || null
});

const Calendar = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', location: '' });

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                // For simplicity, we'll just list ongoing classes as "events"
                // A real calendar would integrate a library like react-big-calendar
                const data = await getCalendarEvents();
                const list = data?.data || data?.events || data || [];
                setEvents(Array.isArray(list) ? list.map(normalizeEvent) : []);
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
        if (!form.title || !form.startTime) {
            setSubmitError('Title and start time are required.');
            return;
        }
        setSubmitError('');
        setSaving(true);
        try {
            const payload = {
                title: form.title,
                eventDate: form.startTime,
                description: form.description || undefined
            };
            const created = await createCalendarEvent(payload);
            const normalizedCreated = normalizeEvent({
                ...(created?.event || created || {}),
                endTime: form.endTime || null,
                location: form.location || ''
            });
            setEvents((prev) => [normalizedCreated, ...prev]);
            setForm({ title: '', description: '', startTime: '', endTime: '', location: '' });
        } catch (err) {
            console.error(err);
            setSubmitError(err?.response?.data?.message || 'Could not create event. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="section-card text-center">Loading...</div>;

    const dayBuckets = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, idx) => ({
        label,
        count: events.filter((event) => {
            if (!event.startTime) return false;
            return new Date(event.startTime).getDay() === idx;
        }).length,
    }));
    const upcomingCount = events.filter((event) => event.startTime && new Date(event.startTime) > new Date()).length;
    const scheduledSwaps = events.filter((event) => Boolean(event.swapId)).length;

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
                {submitError ? <p className="text-sm text-red-300">{submitError}</p> : null}
                <Button type="submit" disabled={saving}>Create Event</Button>
            </form>

            <section className="section-card space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="section-title">Weekly Overview</h2>
                    <p className="text-sm text-[#8DA0BF]">Upcoming sessions and swap availability</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <article className="rounded-xl border border-white/10 bg-[#0E1620] p-4">
                        <p className="text-sm text-[#8DA0BF]">Upcoming Sessions</p>
                        <p className="mt-1 text-3xl font-semibold text-[#DCE7F5]">{upcomingCount}</p>
                    </article>
                    <article className="rounded-xl border border-white/10 bg-[#0E1620] p-4">
                        <p className="text-sm text-[#8DA0BF]">Scheduled Swaps</p>
                        <p className="mt-1 text-3xl font-semibold text-[#DCE7F5]">{scheduledSwaps}</p>
                    </article>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {dayBuckets.map((day) => (
                        <article key={day.label} className="rounded-xl border border-white/10 bg-[#0E1620] p-3 text-center">
                            <p className="text-xs uppercase tracking-wide text-[#8DA0BF]">{day.label}</p>
                            <p className="mt-1 text-2xl font-semibold text-[#DCE7F5]">{day.count}</p>
                            <p className="text-xs text-[#6F83A3]">sessions</p>
                        </article>
                    ))}
                </div>
            </section>
            
            <div className="section-card p-0! overflow-hidden">
                {events.length === 0 ? (
                    <div className="p-6 text-center text-[#8DA0BF]">
                        No active classes scheduled.
                    </div>
                ) : (
                    <ul className="divide-y divide-white/5">
                        {events.map(cls => (
                            <li key={cls.id} className="p-5 md:p-6 hover:bg-[#151D27] transition-colors">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-[17px] font-semibold text-[#DCE7F5]">
                                            {cls.title || `Event #${cls.id}`}
                                        </h3>
                                        <p className="text-sm text-[#8DA0BF]">
                                            {cls.startTime ? new Date(cls.startTime).toLocaleString() : 'No start'}
                                            {cls.endTime ? ` → ${new Date(cls.endTime).toLocaleString()}` : ''}
                                        </p>
                                        {cls.location && <p className="text-sm text-[#8DA0BF]">Location: {cls.location}</p>}
                                        {cls.description && <p className="mt-1 text-sm text-[#8DA0BF]">{cls.description}</p>}
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
