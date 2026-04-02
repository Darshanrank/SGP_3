import { normalizeTimeZone } from '../utils/timezone';

const emptyTeachSkill = () => ({
    id: null,
    skillId: null,
    skillName: '',
    level: 'MEDIUM',
    proofUrl: '',
    videoUrl: '',
    videoFile: null,
    uploadProgress: 0,
    isUploading: false
});

const emptyLearnSkill = () => ({ id: null, skillId: null, skillName: '', level: 'MEDIUM' });

const WEEK_DAYS = [
    { value: 'MONDAY', label: 'Mon', fullLabel: 'Monday' },
    { value: 'TUESDAY', label: 'Tue', fullLabel: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wed', fullLabel: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thu', fullLabel: 'Thursday' },
    { value: 'FRIDAY', label: 'Fri', fullLabel: 'Friday' },
    { value: 'SATURDAY', label: 'Sat', fullLabel: 'Saturday' },
    { value: 'SUNDAY', label: 'Sun', fullLabel: 'Sunday' }
];

const DAY_ORDER = WEEK_DAYS.reduce((acc, day, index) => {
    acc[day.value] = index;
    return acc;
}, {});

const sortDays = (days = []) => {
    const normalized = [...new Set(days.map((day) => String(day).toUpperCase()))].filter((day) => day in DAY_ORDER);
    normalized.sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
    return normalized;
};

const formatSelectedDays = (days = []) => {
    const sorted = sortDays(days);
    if (!sorted.length) return 'No days selected';
    if (sorted.length === WEEK_DAYS.length) return 'All Days';

    return sorted
        .map((dayValue) => WEEK_DAYS.find((day) => day.value === dayValue)?.label || dayValue.slice(0, 3))
        .join(', ');
};

const emptyAvailability = (timezone = 'UTC') => ({
    days: ['MONDAY'],
    startTime: '09:00',
    endTime: '10:00',
    timezone: normalizeTimeZone(timezone, 'UTC')
});

const groupAvailabilitySlots = (availability = [], fallbackTimezone = 'UTC') => {
    if (!Array.isArray(availability) || !availability.length) return [];

    const grouped = new Map();

    availability.forEach((slot) => {
        const startTime = slot?.startTime;
        const endTime = slot?.endTime;
        const timezone = normalizeTimeZone(slot?.timezone, fallbackTimezone);
        const days = Array.isArray(slot?.days) ? slot.days : slot?.dayOfWeek ? [slot.dayOfWeek] : [];

        if (!startTime || !endTime || !timezone) return;

        const key = `${startTime}|${endTime}|${timezone}`;
        if (!grouped.has(key)) {
            grouped.set(key, {
                days: [],
                startTime,
                endTime,
                timezone
            });
        }

        const existing = grouped.get(key);
        existing.days = sortDays([...existing.days, ...days]);
    });

    return Array.from(grouped.values()).map((slot) => ({ ...slot, days: sortDays(slot.days) }));
};

const flattenAvailabilitySlots = (slots = [], fallbackTimezone = 'UTC') => {
    if (!Array.isArray(slots)) return [];

    const flattened = [];
    slots.forEach((slot) => {
        const timezone = normalizeTimeZone(slot?.timezone, fallbackTimezone);
        const startTime = slot?.startTime;
        const endTime = slot?.endTime;
        const days = Array.isArray(slot?.days) ? slot.days : slot?.dayOfWeek ? [slot.dayOfWeek] : [];

        if (!timezone || !startTime || !endTime) return;

        sortDays(days).forEach((dayOfWeek) => {
            flattened.push({ dayOfWeek, startTime, endTime, timezone });
        });
    });

    const deduplicated = new Map();
    flattened.forEach((slot) => {
        deduplicated.set(`${slot.dayOfWeek}|${slot.startTime}|${slot.endTime}|${slot.timezone}`, slot);
    });
    return Array.from(deduplicated.values());
};

const languageOptions = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Chinese', 'Japanese'];

const teachingStyleOptions = [
    'Hands-on Practice',
    'Project Based Learning',
    'Step-by-Step Explanation',
    'Live Coding Sessions',
    'Concept Based Teaching',
    'Debugging Together',
    'Pair Programming',
    'Code Reviews',
    'Interactive Discussions',
    'Real-world Examples',
    'Visual Diagrams & Whiteboard',
    'Assignments & Exercises'
];

const PROFILE_STEPS = [
    { id: 1, label: 'Basic Info' },
    { id: 2, label: 'Skills' },
    { id: 3, label: 'Time Slots' }
];

const BIO_MAX_LENGTH = 2000;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_REGEX = /^[a-z0-9_]+$/;
const URL_REGEX = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;

const splitFullName = (fullName = '') => {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ')
    };
};

const composeFullName = (firstName = '', lastName = '') => `${String(firstName).trim()} ${String(lastName).trim()}`.trim();

const validateUrl = (url) => {
    if (!url) return null;
    return URL_REGEX.test(url) ? null : 'Enter a valid URL';
};

const normalizeTeachingStyles = (styles = []) => {
    if (!Array.isArray(styles)) return [];
    const allowed = new Set(teachingStyleOptions);
    const seen = new Set();
    const result = [];

    styles.forEach((style) => {
        const text = String(style || '').trim();
        if (!allowed.has(text) || seen.has(text)) return;
        seen.add(text);
        result.push(text);
    });

    return result;
};

const parseTeachingStyles = (profile = {}) => {
    if (Array.isArray(profile.teachingStyles)) {
        return normalizeTeachingStyles(profile.teachingStyles);
    }

    if (typeof profile.teachingStyles === 'string') {
        try {
            const parsed = JSON.parse(profile.teachingStyles);
            return normalizeTeachingStyles(parsed);
        } catch (_) {
            return normalizeTeachingStyles(profile.teachingStyles.split(',').map((item) => item.trim()));
        }
    }

    if (typeof profile.teachingStyle === 'string' && profile.teachingStyle.trim()) {
        try {
            const parsed = JSON.parse(profile.teachingStyle);
            return normalizeTeachingStyles(parsed);
        } catch (_) {
            return normalizeTeachingStyles(profile.teachingStyle.split(',').map((item) => item.trim()));
        }
    }

    return [];
};

const profileContainerClass = 'max-w-6xl mx-auto px-6 py-8 space-y-6';
const profileCardClass = 'bg-[#111721] border border-white/5 rounded-xl p-6 shadow-md';

const renderStarRow = (score = 0) => {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(score) || 0)));
    return '★'.repeat(rounded) || '☆';
};

export {
    emptyTeachSkill,
    emptyLearnSkill,
    WEEK_DAYS,
    sortDays,
    formatSelectedDays,
    emptyAvailability,
    groupAvailabilitySlots,
    flattenAvailabilitySlots,
    languageOptions,
    teachingStyleOptions,
    PROFILE_STEPS,
    BIO_MAX_LENGTH,
    USERNAME_MIN,
    USERNAME_MAX,
    USERNAME_REGEX,
    splitFullName,
    composeFullName,
    validateUrl,
    normalizeTeachingStyles,
    parseTeachingStyles,
    profileContainerClass,
    profileCardClass,
    renderStarRow
};
