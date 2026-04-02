import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent } from '../services/meta.service';
import { Button } from '../components/ui/Button';
import AvailabilitySchedule from '../components/AvailabilitySchedule';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(BigCalendar);

const FILTER_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Teaching', value: 'teaching' },
    { label: 'Learning', value: 'learning' },
    { label: 'Swap', value: 'swap' },
    { label: 'Personal', value: 'personal' }
];

const getStatusStyle = (status) => {
    switch (status) {
        case 'scheduled':
            return 'bg-yellow-500/10 text-yellow-400';
        case 'completed':
            return 'bg-green-500/10 text-green-400';
        case 'cancelled':
            return 'bg-red-500/10 text-red-400';
        default:
            return 'bg-gray-500/10 text-gray-400';
    }
};

const getCalendarEventVisual = (status) => {
    switch (status) {
        case 'completed':
            return { bg: '#86efac', text: '#052e16' };
        case 'cancelled':
            return { bg: '#fca5a5', text: '#450a0a' };
        case 'scheduled':
        default:
            return { bg: '#facc15', text: '#111827' };
    }
};

const getCalendarEventClass = (type) => {
    switch (type) {
        case 'teaching':
            return 'bg-green-500 text-white';
        case 'learning':
            return 'bg-blue-500 text-white';
        case 'swap':
            return 'bg-purple-500 text-white';
        case 'personal':
            return 'bg-yellow-500 text-black';
        default:
            return 'bg-slate-500 text-white';
    }
};

const getEventEmoji = (type) => {
    switch (type) {
        case 'teaching':
            return '📘';
        case 'learning':
            return '🎯';
        case 'swap':
            return '🔁';
        case 'personal':
            return '🗓️';
        default:
            return '📌';
    }
};

const dayStyleGetter = (date) => {
    const today = new Date();
    const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    if (!isToday) return {};

    return {
        style: {
            backgroundColor: 'rgba(59,130,246,0.15)',
            borderRadius: '8px',
            color: '#1d4ed8',
            boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.35)'
        }
    };
};

const getLocalTimeZoneLabel = (referenceDate = new Date()) => {
    try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(referenceDate);
        const tzName = parts.find((part) => part.type === 'timeZoneName')?.value;
        return tzName || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time';
    } catch (_) {
        return 'Local time';
    }
};

const CalendarEventCard = ({ event }) => {
    const startText = new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const visual = getCalendarEventVisual(event.status || 'scheduled');

    return (
        <div
            className="h-full w-full rounded-md px-2 py-1 text-xs font-medium"
            style={{ backgroundColor: visual.bg, color: visual.text }}
        >
            <div className="truncate">{getEventEmoji(event.type)} {event.title}</div>
            <div className="text-[10px] opacity-90">{startText}</div>
            <div className="text-[10px] opacity-90">{event.status || 'scheduled'}</div>
        </div>
    );
};

const TodayDateHeader = ({ label, date }) => {
    const now = new Date();
    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    return (
        <div className="flex flex-col items-start leading-tight">
            {isToday ? <span className="mb-0.5 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">Today</span> : null}
            <span>{label}</span>
        </div>
    );
};

// Helper function to get session type styling
const getSessionStyle = (type) => {
    switch (type) {
        case 'teaching':
            return 'bg-green-500/10 text-green-400';
        case 'learning':
            return 'bg-blue-500/10 text-blue-400';
        case 'swap':
            return 'bg-purple-500/10 text-purple-400';
        case 'personal':
            return 'bg-yellow-500/10 text-yellow-400';
        default:
            return 'bg-gray-500/10 text-gray-400';
    }
};

// Helper function to get calendar event color based on type
const getCalendarEventColor = (type) => {
    switch (type) {
        case 'teaching':
            return '#22c55e';
        case 'learning':
            return '#3b82f6';
        case 'swap':
            return '#a855f7';
        case 'personal':
            return '#eab308';
        default:
            return '#6b7280';
    }
};

// Helper function to check if user can join (within 10 minutes before start)
const canJoinSession = (session) => {
    if ((session.status || 'scheduled') !== 'scheduled') return false;
    const now = new Date();
    const start = new Date(session.start);
    const end = new Date(session.end);
    return now >= new Date(start.getTime() - 10 * 60 * 1000) && now <= end;
};

// Helper function to format upcoming session time
const formatUpcomingTime = (date) => {
    const tzLabel = getLocalTimeZoneLabel(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (sessionDate.getTime() === today.getTime()) {
        return `Today • ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${tzLabel}, your local time)`;
    } else if (sessionDate.getTime() === tomorrow.getTime()) {
        return `Tomorrow • ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${tzLabel}, your local time)`;
    } else {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${days[date.getDay()]} • ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${tzLabel}, your local time)`;
    }
};

const toIsoLocalDate = (date) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
};

const toIsoLocalTime = (date) => {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const mergeDateAndTime = (dateValue, timeValue) => {
    const [year, month, day] = String(dateValue).split('-').map(Number);
    const [hours, minutes] = String(timeValue).split(':').map(Number);
    return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
};

const mapApiEventToCalendar = (event) => {
    const start = new Date(event.startTime || event.eventDate);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + (45 * 60000));

    return {
        ...event,
        id: event.id,
        title: event.title || 'Session',
        start,
        end,
        swapClassId: event.swapClassId || null,
        type: event.type || 'personal',
        status: event.status || 'scheduled',
        reminderMinutes: Number(event.reminderMinutes || 10),
        description: event.description || '',
        location: event.location || ''
    };
};

const buildFormFromDate = (date) => ({
    title: '',
    date: toIsoLocalDate(date),
    time: toIsoLocalTime(date),
    duration: '45',
    reminderMinutes: '10',
    description: '',
    location: '',
    type: 'personal',
    status: 'scheduled'
});

const Calendar = () => {
    const [events, setEvents] = useState([]);
    const [filter, setFilter] = useState('all');
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState('month');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [formError, setFormError] = useState('');
    const [sessionForm, setSessionForm] = useState(buildFormFromDate(new Date()));
    const remindedSessionKeysRef = useRef(new Set());

    const fetchEvents = async () => {
        try {
            const payload = await getCalendarEvents(1, 300);
            const list = Array.isArray(payload) ? payload : (payload?.data || []);
            setEvents(list.map(mapApiEventToCalendar));
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to load calendar events');
        }
    };

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            await fetchEvents();
            setLoading(false);
        };
        run();
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = new Date();
            events.forEach((session) => {
                const status = session.status || 'scheduled';
                if (status !== 'scheduled') return;

                const reminderMinutes = Number(session.reminderMinutes || 10);
                const start = new Date(session.start);
                const reminderTime = new Date(start.getTime() - reminderMinutes * 60000);
                const reminderKey = `${session.id}-${start.toISOString()}-${reminderMinutes}`;

                if (now >= reminderTime && now <= start && !remindedSessionKeysRef.current.has(reminderKey)) {
                    remindedSessionKeysRef.current.add(reminderKey);
                    toast.info(`Reminder: ${session.title} starts in ${reminderMinutes} minutes`);
                }
            });
        }, 60000);

        return () => clearInterval(intervalId);
    }, [events]);

    const upcomingCount = useMemo(
        () => events.filter((event) => event.start > new Date()).length,
        [events]
    );

    const scheduledSwaps = useMemo(
        () => events.filter((event) => Boolean(event.swapClassId)).length,
        [events]
    );

    const upcomingSessions = useMemo(
        () => events
            .filter(session => new Date(session.start) > new Date() && (session.status || 'scheduled') !== 'cancelled')
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, 5),
        [events]
    );

    const filteredEvents = useMemo(
        () => events.filter((event) => (filter === 'all' ? true : event.type === filter)),
        [events, filter]
    );

    const updateEventInState = (updatedEvent) => {
        setEvents((prev) => prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)));
    };

    const handleEventDrop = async ({ event, start, end }) => {
        const previousEvent = event;
        const updatedEvent = {
            ...event,
            start,
            end
        };

        updateEventInState(updatedEvent);

        try {
            await updateCalendarEvent(event.id, {
                startTime: start.toISOString(),
                endTime: end.toISOString()
            });
            toast.success('Session rescheduled');
        } catch (error) {
            updateEventInState(previousEvent);
            toast.error(error?.response?.data?.message || 'Could not reschedule session');
        }
    };

    const handleEventResize = async ({ event, start, end }) => {
        await handleEventDrop({ event, start, end });
    };

    const resetForm = (date = new Date()) => {
        setSessionForm(buildFormFromDate(date));
        setFormError('');
        setEditingEventId(null);
    };

    const openCreateSessionModal = (date = new Date()) => {
        resetForm(date);
        setSessionModalOpen(true);
    };

    const handleSelectSlot = (slotInfo) => {
        openCreateSessionModal(slotInfo?.start || new Date());
    };

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setEventModalOpen(true);
    };

    const handleSaveSession = async (e) => {
        e.preventDefault();
        const durationMinutes = Number(sessionForm.duration || 45);
        if (!sessionForm.title.trim()) {
            setFormError('Skill / session title is required.');
            return;
        }

        const start = mergeDateAndTime(sessionForm.date, sessionForm.time);
        const end = new Date(start.getTime() + (durationMinutes * 60000));
        setSaving(true);
        setFormError('');

        const payload = {
            title: sessionForm.title.trim(),
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            reminderMinutes: Number(sessionForm.reminderMinutes || 10),
            description: sessionForm.description?.trim() || undefined,
            location: sessionForm.location?.trim() || undefined,
            type: sessionForm.type || 'personal',
            status: sessionForm.status || 'scheduled'
        };

        try {
            if (editingEventId) {
                await updateCalendarEvent(editingEventId, payload);
                toast.success('Session updated');
            } else {
                await createCalendarEvent(payload);
                toast.success('Session created');
            }

            setSessionModalOpen(false);
            setEditingEventId(null);
            await fetchEvents();
        } catch (error) {
            setFormError(error?.response?.data?.message || 'Could not save session.');
        } finally {
            setSaving(false);
        }
    };

    const handleEditFromDetails = () => {
        if (!selectedEvent) return;
        setEventModalOpen(false);
        setEditingEventId(selectedEvent.id);
        const duration = Math.max(15, Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / 60000));
        setSessionForm({
            title: selectedEvent.title || '',
            date: toIsoLocalDate(selectedEvent.start),
            time: toIsoLocalTime(selectedEvent.start),
            duration: String(duration),
            reminderMinutes: String(selectedEvent.reminderMinutes || 10),
            description: selectedEvent.description || '',
            location: selectedEvent.location || '',
            type: selectedEvent.type || 'personal',
            status: selectedEvent.status || 'scheduled'
        });
        setFormError('');
        setSessionModalOpen(true);
    };

    const handleCancelSession = async () => {
        if (!selectedEvent) return;
        try {
            await updateCalendarEvent(selectedEvent.id, { status: 'cancelled' });
            toast.success('Session cancelled');
            setEventModalOpen(false);
            setSelectedEvent(null);
            await fetchEvents();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not cancel session');
        }
    };

    if (loading) {
        return <div className="section-card text-center">Loading schedule...</div>;
    }

    return (
        <div className="page-shell space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="page-title">My Schedule</h1>
                <Button size="sm" onClick={() => openCreateSessionModal(new Date())}>Add Session</Button>
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

            <section className="section-card space-y-4">
                <h2 className="section-title">Calendar</h2>
                <div className="flex flex-wrap gap-2">
                    {FILTER_OPTIONS.map((option) => {
                        const active = filter === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFilter(option.value)}
                                className={`bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-sm transition ${active ? 'text-white ring-1 ring-slate-500' : 'text-slate-300'}`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
                <div className="skillswap-calendar text-[#e5e7eb]">
                    <DnDCalendar
                        localizer={localizer}
                        events={filteredEvents}
                        date={calendarDate}
                        view={calendarView}
                        step={60}
                        timeslots={1}
                        startAccessor="start"
                        endAccessor="end"
                        selectable
                        resizable
                        style={{ height: 620 }}
                        dayPropGetter={dayStyleGetter}
                        components={{
                            event: CalendarEventCard,
                            month: {
                                dateHeader: TodayDateHeader
                            }
                        }}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        onNavigate={(nextDate) => setCalendarDate(nextDate)}
                        onView={(nextView) => setCalendarView(nextView)}
                        onEventDrop={handleEventDrop}
                        onEventResize={handleEventResize}
                        tooltipAccessor={(event) => `${event.title}\n${new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}\nTeacher: ${event.teacherName || event.hostName || 'SkillSwap Mentor'}`}
                        eventPropGetter={(event) => {
                            const visual = getCalendarEventVisual(event.status || 'scheduled');
                            return ({
                            style: {
                                backgroundColor: visual.bg,
                                color: visual.text,
                                borderRadius: '8px',
                                border: 'none',
                                padding: 0,
                                overflow: 'hidden'
                            }
                        });
                        }}
                    />
                </div>
            </section>

            <section className="section-card space-y-4">
                <h2 className="section-title">Upcoming Sessions</h2>
                <p className="text-xs text-[#8DA0BF]">All times are shown in your local timezone.</p>
                {upcomingSessions.length === 0 ? (
                    <p className="rounded-lg border border-white/10 bg-[#0E1620] p-4 text-sm text-[#8DA0BF]">No upcoming sessions scheduled.</p>
                ) : (
                    <div className="space-y-3">
                        {upcomingSessions.map((session) => (
                            <div key={session.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#0E1620] p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-[#DCE7F5]">{session.title}</h4>
                                        <div className={`rounded-full px-2 py-1 text-xs font-medium ${getSessionStyle(session.type)}`}>
                                            {session.type}
                                        </div>
                                        <div className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusStyle(session.status || 'scheduled')}`}>
                                            {session.status || 'scheduled'}
                                        </div>
                                    </div>
                                    <p className="mt-1 text-sm text-[#8DA0BF]">{formatUpcomingTime(session.start)}</p>
                                    {session.location ? <p className="text-xs text-[#8DA0BF]">📍 {session.location}</p> : null}
                                </div>
                                <div className="flex gap-2">
                                    {session.swapClassId ? (
                                        canJoinSession(session) ? (
                                            <Link to={`/swaps/${session.swapClassId}`}>
                                                <Button size="sm">Join Classroom</Button>
                                            </Link>
                                        ) : (
                                            <Button size="sm" disabled className="cursor-not-allowed opacity-60">Not Available Yet</Button>
                                        )
                                    ) : null}
                                    <Button size="sm" variant="secondary" onClick={() => { setSelectedEvent(session); setEventModalOpen(true); }}>
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <AvailabilitySchedule />

            {sessionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSessionModalOpen(false)}>
                    <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#DCE7F5]">{editingEventId ? 'Edit Session' : 'Create Session'}</h3>
                        <form onSubmit={handleSaveSession} className="mt-4 space-y-3">
                            <div>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Skill / Title</label>
                                <input
                                    value={sessionForm.title}
                                    onChange={(e) => setSessionForm((prev) => ({ ...prev, title: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                    placeholder="Python Session"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Session Type</label>
                                <select
                                    value={sessionForm.type}
                                    onChange={(e) => setSessionForm((prev) => ({ ...prev, type: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                >
                                    <option value="personal">Personal</option>
                                    <option value="teaching">Teaching</option>
                                    <option value="learning">Learning</option>
                                    <option value="swap">Swap</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Date</label>
                                    <input
                                        type="date"
                                        value={sessionForm.date}
                                        onChange={(e) => setSessionForm((prev) => ({ ...prev, date: e.target.value }))}
                                        className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Time</label>
                                    <input
                                        type="time"
                                        value={sessionForm.time}
                                        onChange={(e) => setSessionForm((prev) => ({ ...prev, time: e.target.value }))}
                                        className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Duration</label>
                                <select
                                    value={sessionForm.duration}
                                    onChange={(e) => setSessionForm((prev) => ({ ...prev, duration: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                >
                                    <option value="45">45 minutes</option>
                                    <option value="60">60 minutes</option>
                                    <option value="90">90 minutes</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Reminder</label>
                                <select
                                    value={sessionForm.reminderMinutes}
                                    onChange={(e) => setSessionForm((prev) => ({ ...prev, reminderMinutes: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                >
                                    <option value="10">10 minutes before</option>
                                    <option value="30">30 minutes before</option>
                                    <option value="60">1 hour before</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Location</label>
                                <input
                                    value={sessionForm.location}
                                    onChange={(e) => setSessionForm((prev) => ({ ...prev, location: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                    placeholder="Zoom / Meet / Classroom"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-[#8DA0BF]">Description</label>
                                <textarea
                                    rows={3}
                                    value={sessionForm.description}
                                    onChange={(e) => setSessionForm((prev) => ({ ...prev, description: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]"
                                />
                            </div>
                            {formError ? <p className="text-xs text-red-400">{formError}</p> : null}
                            <div className="flex justify-end gap-2 pt-1">
                                <Button type="button" variant="ghost" onClick={() => setSessionModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Session'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {eventModalOpen && selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEventModalOpen(false)}>
                    <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-[#DCE7F5]">{selectedEvent.title}</h3>
                            <div className="flex items-center gap-2">
                                <div className={`rounded-full px-2 py-1 text-xs font-medium ${getSessionStyle(selectedEvent.type)}`}>
                                    {selectedEvent.type}
                                </div>
                                <div className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusStyle(selectedEvent.status || 'scheduled')}`}>
                                    {selectedEvent.status || 'scheduled'}
                                </div>
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-[#8DA0BF]">Date: {selectedEvent.start.toLocaleDateString()}</p>
                        <p className="text-sm text-[#8DA0BF]">Time: {selectedEvent.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {selectedEvent.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                        <p className="text-sm text-[#8DA0BF]">Duration: {Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / 60000)} minutes</p>
                        <p className="text-sm text-[#8DA0BF]">Reminder: {selectedEvent.reminderMinutes || 10} minutes before</p>
                        {selectedEvent.location ? <p className="text-sm text-[#8DA0BF]">Location: {selectedEvent.location}</p> : null}
                        {selectedEvent.description ? <p className="mt-3 text-sm text-[#DCE7F5]">{selectedEvent.description}</p> : null}

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            {selectedEvent.swapClassId && canJoinSession(selectedEvent) ? (
                                <Link to={`/swaps/${selectedEvent.swapClassId}`}>
                                    <Button size="sm">Join Classroom</Button>
                                </Link>
                            ) : null}
                            <Button size="sm" variant="secondary" onClick={handleEditFromDetails}>Reschedule</Button>
                            {(selectedEvent.status || 'scheduled') !== 'cancelled' ? (
                                <Button size="sm" variant="danger" onClick={handleCancelSession}>Cancel Session</Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
