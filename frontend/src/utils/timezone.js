const getBrowserTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (_) {
        return 'UTC';
    }
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

    try {
        new Intl.DateTimeFormat('en-US', { timeZone: partnerTimeZone }).format(new Date());
        return true;
    } catch (_) {
        return false;
    }
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
