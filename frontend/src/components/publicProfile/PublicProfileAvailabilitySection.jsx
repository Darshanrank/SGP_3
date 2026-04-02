const dayLabelMap = {
    MONDAY: 'Mon',
    TUESDAY: 'Tue',
    WEDNESDAY: 'Wed',
    THURSDAY: 'Thu',
    FRIDAY: 'Fri',
    SATURDAY: 'Sat',
    SUNDAY: 'Sun'
};

const formatAvailabilityTime = (value) => {
    if (!value || typeof value !== 'string') return '--';
    const [h, m] = value.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
    const meridiem = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${meridiem}`;
};

const PublicProfileAvailabilitySection = ({ availabilitySlots }) => {
    return (
        <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            <h2 className="mb-4 text-lg font-bold text-[#DCE7F5]">🕒 Availability</h2>
            {availabilitySlots.length > 0 ? (
                <div className="space-y-2">
                    {availabilitySlots.map((slot) => (
                        <div key={`${slot.id || slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]">
                            <span>{dayLabelMap[String(slot.dayOfWeek || '').toUpperCase()] || slot.dayOfWeek}</span>
                            <span className="text-[#8DA0BF]">{formatAvailabilityTime(slot.startTime)} - {formatAvailabilityTime(slot.endTime)}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-sm text-[#8DA0BF]">No availability added yet.</div>
            )}
        </div>
    );
};

export default PublicProfileAvailabilitySection;
