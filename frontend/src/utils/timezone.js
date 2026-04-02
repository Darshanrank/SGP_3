const getBrowserTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (_) {
        return 'UTC';
    }
};

const COMMON_TIME_ZONES = [
    'UTC',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Singapore',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Australia/Sydney'
];

export const getSupportedTimeZones = () => {
    if (typeof Intl.supportedValuesOf === 'function') {
        try {
            const values = Intl.supportedValuesOf('timeZone');
            if (Array.isArray(values) && values.length > 0) return values;
        } catch (_) {
            // Fall back to curated list below.
        }
    }

    return COMMON_TIME_ZONES;
};

export const isValidTimeZone = (value) => {
    const timeZone = String(value || '').trim();
    if (!timeZone) return false;

    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch (_) {
        return false;
    }
};

export const normalizeTimeZone = (value, fallback = 'UTC') => {
    const candidate = String(value || '').trim();
    if (isValidTimeZone(candidate)) return candidate;
    if (isValidTimeZone(fallback)) return fallback;
    return 'UTC';
};

export const getTimeZoneShortLabel = (referenceDate = new Date(), timeZone) => {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'short'
        }).formatToParts(referenceDate);

        return parts.find((part) => part.type === 'timeZoneName')?.value || timeZone || getBrowserTimeZone();
    } catch (_) {
        return timeZone || getBrowserTimeZone();
    }
};

const isUsablePartnerTimeZone = (partnerTimeZone) => {
    if (!partnerTimeZone || typeof partnerTimeZone !== 'string') return false;
    return isValidTimeZone(partnerTimeZone);
};

export const formatSessionWithPartnerTime = (sessionDate, partnerTimeZone) => {
    if (!sessionDate) return 'No session scheduled';

    const date = sessionDate instanceof Date ? sessionDate : new Date(sessionDate);
    if (Number.isNaN(date.getTime())) return 'No session scheduled';

    const localTimeZone = getBrowserTimeZone();
    const localLabel = getTimeZoneShortLabel(date);
    const localText = `${date.toLocaleString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
    }).replace(',', ' •')} (${localLabel}, your local time)`;

    if (!isUsablePartnerTimeZone(partnerTimeZone) || partnerTimeZone === localTimeZone) {
        return localText;
    }

    const partnerLabel = getTimeZoneShortLabel(date, partnerTimeZone);
    const partnerText = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: partnerTimeZone
    }).format(date).replace(',', ' •');

    return `${localText} • Partner: ${partnerText} (${partnerLabel})`;
};
