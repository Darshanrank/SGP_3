import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, sendUpcomingReminder, updateProfile, deleteAccount } from '../services/profile.service';
import { addSkill, createSkill, getAllSkills, getUserSkills, removeSkill, uploadSkillDemo } from '../services/skill.service';
import { Editor } from '@tinymce/tinymce-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Check, Camera, Trash2, Github, Linkedin, Globe, Youtube } from 'lucide-react';

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
    timezone
});

const groupAvailabilitySlots = (availability = [], fallbackTimezone = 'UTC') => {
    if (!Array.isArray(availability) || !availability.length) return [];

    const grouped = new Map();

    availability.forEach((slot) => {
        const startTime = slot?.startTime;
        const endTime = slot?.endTime;
        const timezone = slot?.timezone || fallbackTimezone;
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
        const timezone = slot?.timezone || fallbackTimezone;
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
    if (!url) return null; // optional
    return URL_REGEX.test(url) ? null : 'Enter a valid URL';
};

const Profile = () => {
    const { refreshUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isSetupMode = useMemo(() => new URLSearchParams(location.search).get('setup') === '1', [location.search]);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingReminder, setSendingReminder] = useState(false);
    const [existingUserSkills, setExistingUserSkills] = useState([]);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [editorLoading, setEditorLoading] = useState(true);
    const avatarInputRef = useRef(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        bio: '',
        learningLanguage: '',
        githubLink: '',
        linkedinLink: '',
        portfolioLink: '',
        youtubeLink: '',
        timezone: 'UTC',
        upcomingSessions: '',
        emailRemindersEnabled: true,
        avatarFile: null,
        avatarUrl: '',
        teachSkills: [emptyTeachSkill()],
        learnSkills: [emptyLearnSkill()],
        availability: [emptyAvailability('UTC')]
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const [profileData, skillsData] = await Promise.all([getMyProfile(), getUserSkills()]);

                const teachSkills = skillsData
                    .filter((item) => item.type === 'TEACH')
                    .map((item) => ({
                        id: item.id,
                        skillId: item.skillId,
                        skillName: item.skill?.name || '',
                        level: item.level || 'MEDIUM',
                        proofUrl: item.proofUrl || '',
                        videoUrl: item.preview?.videoUrl || '',
                        videoFile: null,
                        uploadProgress: 0,
                        isUploading: false
                    }));

                const learnSkills = skillsData
                    .filter((item) => item.type === 'LEARN')
                    .map((item) => ({
                        id: item.id,
                        skillId: item.skillId,
                        skillName: item.skill?.name || '',
                        level: item.level || 'MEDIUM'
                    }));

                setExistingUserSkills(skillsData.map((item) => ({ id: item.id, type: item.type })));

                const profile = profileData.profile || {};
                setAvatarPreview(profile.avatarUrl || '');

                const timezone = profile.timezone || 'UTC';
                const { firstName, lastName } = splitFullName(profile.fullName || '');

                setFormData({
                    firstName,
                    lastName,
                    username: String(profileData.username || '').toLowerCase(),
                    bio: profile.bio || '',
                    learningLanguage: profile.learningLanguage || 'English',
                    githubLink: profile.githubLink || '',
                    linkedinLink: profile.linkedinLink || '',
                    portfolioLink: profile.portfolioLink || '',
                    youtubeLink: profile.youtubeLink || '',
                    timezone,
                    upcomingSessions: profile.upcomingSessions || '',
                    emailRemindersEnabled: profile.emailRemindersEnabled ?? true,
                    avatarFile: null,
                    avatarUrl: profile.avatarUrl || '',
                    teachSkills: teachSkills.length ? teachSkills : [emptyTeachSkill()],
                    learnSkills: learnSkills.length ? learnSkills : [emptyLearnSkill()],
                    availability: profileData.availability?.length
                        ? groupAvailabilitySlots(profileData.availability, timezone)
                        : [emptyAvailability(timezone)]
                });
                if (!isSetupMode && profile.profileCompleted) setStep(1);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [isSetupMode]);

    const updateField = (key, value) => {
        const normalizedValue = key === 'username' ? String(value).trim().toLowerCase() : value;
        setFormData((prev) => ({ ...prev, [key]: normalizedValue }));
        // Live validation
        validateField(key, normalizedValue);
    };

    const markTouched = (key) => {
        setTouched((prev) => ({ ...prev, [key]: true }));
        validateField(key, formData[key]);
    };

    const validateField = (key, value) => {
        let error = null;
        switch (key) {
            case 'firstName':
                if (!value?.trim()) error = 'First name is required';
                break;
            case 'lastName':
                if (!value?.trim()) error = 'Last name is required';
                break;
            case 'username':
                if (!value?.trim()) error = 'Username is required';
                else if (value.trim().length < USERNAME_MIN) error = `At least ${USERNAME_MIN} characters`;
                else if (value.trim().length > USERNAME_MAX) error = `Max ${USERNAME_MAX} characters`;
                else if (!USERNAME_REGEX.test(value.trim())) error = 'Use only lowercase letters, numbers, and underscore (_)';
                break;
            case 'bio':
                if (value && value.replace(/<[^>]*>/g, '').length > BIO_MAX_LENGTH) error = `Bio exceeds ${BIO_MAX_LENGTH} characters`;
                break;
            case 'githubLink':
            case 'linkedinLink':
            case 'portfolioLink':
            case 'youtubeLink':
                error = validateUrl(value);
                break;
            default:
                break;
        }
        setFieldErrors((prev) => ({ ...prev, [key]: error }));
        return error;
    };

    const hasValidationErrors = () => {
        const errs = {};
        errs.firstName = validateField('firstName', formData.firstName);
        errs.lastName = validateField('lastName', formData.lastName);
        errs.username = validateField('username', formData.username);
        errs.bio = validateField('bio', formData.bio);
        errs.githubLink = validateField('githubLink', formData.githubLink);
        errs.linkedinLink = validateField('linkedinLink', formData.linkedinLink);
        errs.portfolioLink = validateField('portfolioLink', formData.portfolioLink);
        errs.youtubeLink = validateField('youtubeLink', formData.youtubeLink);
        // Mark all as touched to show errors
        setTouched({ firstName: true, lastName: true, username: true, bio: true, githubLink: true, linkedinLink: true, portfolioLink: true, youtubeLink: true });
        return Object.values(errs).some(Boolean);
    };

    const updateArrayItem = (arrayName, index, key, value) => {
        setFormData((prev) => {
            const next = [...prev[arrayName]];
            const updatedItem = { ...next[index], [key]: value };

            if (key === 'skillName') {
                updatedItem.skillId = null;
                if (updatedItem.id) updatedItem.id = null;
            }

            next[index] = updatedItem;
            return { ...prev, [arrayName]: next };
        });
    };

    const addArrayItem = (arrayName, itemFactory) => {
        setFormData((prev) => ({ ...prev, [arrayName]: [...prev[arrayName], itemFactory()] }));
    };

    const removeArrayItem = (arrayName, index) => {
        setFormData((prev) => {
            const next = prev[arrayName].filter((_, idx) => idx !== index);
            return { ...prev, [arrayName]: next.length ? next : [arrayName === 'teachSkills' ? emptyTeachSkill() : arrayName === 'learnSkills' ? emptyLearnSkill() : emptyAvailability(prev.timezone)] };
        });
    };

    const toggleAvailabilityDay = (slotIndex, dayValue) => {
        setFormData((prev) => {
            const next = [...prev.availability];
            const slot = next[slotIndex];
            if (!slot) return prev;

            const currentDays = sortDays(slot.days || (slot.dayOfWeek ? [slot.dayOfWeek] : []));
            const hasDay = currentDays.includes(dayValue);
            const days = hasDay
                ? currentDays.filter((day) => day !== dayValue)
                : sortDays([...currentDays, dayValue]);

            next[slotIndex] = { ...slot, days };
            return { ...prev, availability: next };
        });
    };

    const setAvailabilityDays = (slotIndex, days) => {
        setFormData((prev) => {
            const next = [...prev.availability];
            const slot = next[slotIndex];
            if (!slot) return prev;

            next[slotIndex] = { ...slot, days: sortDays(days) };
            return { ...prev, availability: next };
        });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please upload a PNG or JPG image.');
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('Image must be 5MB or smaller.');
            return;
        }

        updateField('avatarFile', file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const removeAvatar = () => {
        setAvatarPreview('');
        setFormData((prev) => ({ ...prev, avatarFile: null, avatarUrl: '' }));
        if (avatarInputRef.current) avatarInputRef.current.value = '';
    };

    const updateTeachSkillUpload = (index, patch) => {
        setFormData((prev) => {
            const next = [...prev.teachSkills];
            next[index] = { ...next[index], ...patch };
            return { ...prev, teachSkills: next };
        });
    };

    const resolveSkillId = async (skillName) => {
        const normalizedName = skillName.trim();
        if (!normalizedName) return null;

        const response = await getAllSkills(1, 50, normalizedName);
        const matched = response.data?.find((skill) => skill.name.toLowerCase() === normalizedName.toLowerCase());
        if (matched) return matched.id;

        try {
            const created = await createSkill({ name: normalizedName, category: 'General' });
            return created.id;
        } catch (err) {
            // Skill may have been created by another user between our search and create attempt
            const retry = await getAllSkills(1, 50, normalizedName);
            const retryMatch = retry.data?.find((skill) => skill.name.toLowerCase() === normalizedName.toLowerCase());
            if (retryMatch?.id) return retryMatch.id;
            // Re-throw so the caller can show a meaningful error
            throw new Error(err?.response?.data?.message || `Failed to create skill "${normalizedName}"`);
        }
    };

    const submitAll = async ({ finalize = false } = {}) => {
        if (hasValidationErrors()) {
            toast.error('Please fix the highlighted errors before saving');
            return;
        }
        // Validate teach skill proof URLs
        let hasSkillUrlErrors = false;
        formData.teachSkills.forEach((skill, index) => {
            if (skill.proofUrl && !URL_REGEX.test(skill.proofUrl)) {
                updateArrayItem('teachSkills', index, '_proofUrlError', 'Enter a valid URL');
                hasSkillUrlErrors = true;
            }
        });
        if (hasSkillUrlErrors) {
            toast.error('Please fix invalid proof URLs in your teach skills');
            setStep(2);
            return;
        }
        setSaving(true);
        try {
            const flattenedAvailability = flattenAvailabilitySlots(formData.availability, formData.timezone || 'UTC');
            const fullName = composeFullName(formData.firstName, formData.lastName);
            const profilePayload = new FormData();
            profilePayload.append('fullName', fullName);
            profilePayload.append('username', formData.username);
            profilePayload.append('bio', formData.bio);
            profilePayload.append('learningLanguage', formData.learningLanguage);
            profilePayload.append('githubLink', formData.githubLink);
            profilePayload.append('linkedinLink', formData.linkedinLink);
            profilePayload.append('portfolioLink', formData.portfolioLink);
            profilePayload.append('youtubeLink', formData.youtubeLink);
            profilePayload.append('timezone', formData.timezone);
            profilePayload.append('upcomingSessions', formData.upcomingSessions);
            profilePayload.append('emailRemindersEnabled', String(formData.emailRemindersEnabled));
            // In setup mode, only mark the profile complete on the explicit final action.
            profilePayload.append('profileCompleted', String(!isSetupMode || finalize));
            profilePayload.append('availability', JSON.stringify(flattenedAvailability));
            profilePayload.append('avatarUrl', formData.avatarUrl || '');

            if (formData.avatarFile) {
                profilePayload.append('avatar', formData.avatarFile);
            }

            await updateProfile(profilePayload);

            // Prepare and save teach skills (uploads + save per-skill, each in its own try-catch)
            const retainedSkillIds = new Set();
            let skillSaveErrors = 0;

            for (let i = 0; i < formData.teachSkills.length; i += 1) {
                const teachSkill = formData.teachSkills[i];
                if (!teachSkill.skillName.trim()) continue;

                try {
                    const skillId = teachSkill.skillId || await resolveSkillId(teachSkill.skillName);
                    if (!skillId) {
                        console.warn('Could not resolve skill:', teachSkill.skillName);
                        // Retain old id so cleanup doesn't delete an existing skill
                        if (teachSkill.id) retainedSkillIds.add(teachSkill.id);
                        skillSaveErrors += 1;
                        continue;
                    }

                    let videoUrl = teachSkill.videoUrl;
                    if (teachSkill.videoFile) {
                        updateTeachSkillUpload(i, { isUploading: true, uploadProgress: 0 });
                        const uploaded = await uploadSkillDemo(teachSkill.videoFile, (progress) => {
                            updateTeachSkillUpload(i, { uploadProgress: progress });
                        });
                        videoUrl = uploaded.url;
                        updateTeachSkillUpload(i, { isUploading: false, uploadProgress: 100, videoUrl });
                    }

                    const payload = {
                        skillId,
                        type: 'TEACH',
                        level: teachSkill.level,
                        proofUrl: teachSkill.proofUrl,
                        preview: {
                            videoUrl: videoUrl || undefined,
                            description: `Skill demo for ${teachSkill.skillName}`,
                            syllabusOutline: ''
                        }
                    };

                    const result = await addSkill(payload);
                    if (result?.id) retainedSkillIds.add(result.id);
                } catch (err) {
                    console.error('Failed to save teach skill:', teachSkill.skillName, err);
                    toast.error(`Failed to save skill "${teachSkill.skillName}": ${err?.response?.data?.message || err.message}`);
                    skillSaveErrors += 1;
                    // Retain old id so cleanup doesn't delete an existing skill
                    if (teachSkill.id) retainedSkillIds.add(teachSkill.id);
                }
            }

            // Save learn skills
            for (const learnSkill of formData.learnSkills) {
                if (!learnSkill.skillName.trim()) continue;

                try {
                    const skillId = learnSkill.skillId || await resolveSkillId(learnSkill.skillName);
                    if (!skillId) {
                        if (learnSkill.id) retainedSkillIds.add(learnSkill.id);
                        skillSaveErrors += 1;
                        continue;
                    }

                    const payload = {
                        skillId,
                        type: 'LEARN',
                        level: learnSkill.level
                    };

                    const result = await addSkill(payload);
                    if (result?.id) retainedSkillIds.add(result.id);
                } catch (err) {
                    console.error('Failed to save learn skill:', learnSkill.skillName, err);
                    toast.error(`Failed to save skill "${learnSkill.skillName}": ${err?.response?.data?.message || err.message}`);
                    skillSaveErrors += 1;
                    if (learnSkill.id) retainedSkillIds.add(learnSkill.id);
                }
            }

            // Remove old skills that are no longer in the form
            const removed = existingUserSkills.filter((item) => !retainedSkillIds.has(item.id));
            await Promise.all(removed.map(item => removeSkill(item.id).catch(() => {})));

            const updatedUser = await refreshUser();
            if (skillSaveErrors > 0) {
                toast.error(`${skillSaveErrors} skill(s) could not be saved. Please try again.`);
            } else {
                toast.success(finalize ? 'Profile setup saved successfully' : 'Changes saved');
            }

            if (isSetupMode && finalize) {
                navigate('/dashboard', { replace: true });
            } else {
                // Refresh skills and profile data to keep the form in sync
                const [freshProfile, freshSkills] = await Promise.all([getMyProfile(), getUserSkills()]);
                const profile = freshProfile.profile || {};
                setAvatarPreview(profile.avatarUrl || '');

                const freshTeach = freshSkills
                    .filter((s) => s.type === 'TEACH')
                    .map((s) => ({
                        id: s.id,
                        skillId: s.skillId,
                        skillName: s.skill?.name || '',
                        level: s.level || 'MEDIUM',
                        proofUrl: s.proofUrl || '',
                        videoUrl: s.preview?.videoUrl || '',
                        videoFile: null,
                        uploadProgress: 0,
                        isUploading: false
                    }));
                const freshLearn = freshSkills
                    .filter((s) => s.type === 'LEARN')
                    .map((s) => ({
                        id: s.id,
                        skillId: s.skillId,
                        skillName: s.skill?.name || '',
                        level: s.level || 'MEDIUM'
                    }));

                setExistingUserSkills(freshSkills.map((s) => ({ id: s.id, type: s.type })));
                setFormData((prev) => ({
                    ...prev,
                    avatarUrl: profile.avatarUrl || prev.avatarUrl,
                    avatarFile: null,
                    teachSkills: freshTeach.length ? freshTeach : [emptyTeachSkill()],
                    learnSkills: freshLearn.length ? freshLearn : [emptyLearnSkill()]
                }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save profile setup');
        } finally {
            setSaving(false);
        }
    };

    const handleSendReminder = async () => {
        setSendingReminder(true);
        try {
            const response = await sendUpcomingReminder();
            toast.success(response.message || 'Reminder email sent');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send reminder email');
        } finally {
            setSendingReminder(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full px-4 sm:px-8" style={{ maxWidth: '900px' }}>
            <div className="page-shell">
                <section className="section-card space-y-4">
                    <h3 className="text-lg font-semibold text-[#DCE7F5]">Profile Preview</h3>
                    <div className="rounded-2xl border border-white/10 bg-[#0E1620] p-4 text-center">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Profile" className="mx-auto h-16 w-16 rounded-full object-cover" />
                        ) : (
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0A4D9F]/25 text-lg font-bold text-[#DCE7F5]">
                                {(formData.firstName || formData.username || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <p className="mt-3 text-base font-semibold text-[#DCE7F5]">
                            {composeFullName(formData.firstName, formData.lastName) || 'Your Name'}
                        </p>
                        <p className="text-sm text-[#8DA0BF]">@{formData.username || 'username'}</p>
                    </div>
                    <div className="space-y-2 text-sm text-[#8DA0BF]">
                        <p>Teaching skills: <span className="text-[#DCE7F5]">{formData.teachSkills.filter((s) => s.skillName.trim()).length}</span></p>
                        <p>Learning skills: <span className="text-[#DCE7F5]">{formData.learnSkills.filter((s) => s.skillName.trim()).length}</span></p>
                        <p>Availability slots: <span className="text-[#DCE7F5]">{formData.availability.length}</span></p>
                    </div>
                </section>

                <section className="section-card space-y-4">
                    <div>
                        <h1 className="page-title">Complete Your Profile</h1>
                        <p className="mt-1 text-sm text-[#8DA0BF]">Step {step} of {PROFILE_STEPS.length}</p>
                    </div>

                    <div className="flex items-center">
                        {PROFILE_STEPS.map((item, index) => {
                            const isCompleted = step > item.id;
                            const isCurrent = step === item.id;
                            const isPending = step < item.id;

                            return (
                                <div key={item.id} className="flex flex-1 items-center">
                                    <button
                                        type="button"
                                        onClick={() => setStep(item.id)}
                                        className="group inline-flex items-center gap-3 text-left"
                                    >
                                        <span
                                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                                                isCompleted
                                                    ? 'border-green-600 bg-green-600 text-white'
                                                    : isCurrent
                                                        ? 'border-blue-600 bg-blue-600 text-white'
                                                        : 'border-gray-300 bg-white text-gray-500'
                                            }`}
                                        >
                                            {isCompleted ? <Check className="h-4 w-4" /> : item.id}
                                        </span>
                                        <span
                                            className={`text-sm font-medium ${
                                                isCompleted
                                                    ? 'text-green-700'
                                                    : isCurrent
                                                        ? 'text-blue-700'
                                                        : isPending
                                                            ? 'text-gray-400'
                                                            : 'text-gray-700'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                    </button>

                                    {index < PROFILE_STEPS.length - 1 ? (
                                        <div className={`mx-3 h-0.5 flex-1 rounded-full ${step > item.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {step === 1 && (
                    <div className="space-y-6">
                        <section className="section-card space-y-6">
                            <div className="space-y-1">
                                <h2 className="text-[21px] font-semibold text-[#DCE7F5]">Profile Information</h2>
                                <p className="text-sm text-[#8DA0BF]">Set up your public identity and tell people what you want to learn.</p>
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100"
                                >
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar Preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#DCE7F5]">
                                            {(formData.firstName || formData.username || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100">
                                        <Camera className="h-4 w-4" />
                                    </span>
                                </button>

                                <div className="space-y-2">
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => avatarInputRef.current?.click()}
                                            className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-[#111721] px-3 py-1.5 text-sm font-medium text-[#DCE7F5] hover:bg-[#151D27]"
                                        >
                                            <Camera className="h-4 w-4" />
                                            {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                                        </button>
                                        {avatarPreview && (
                                            <button
                                                type="button"
                                                onClick={removeAvatar}
                                                className="inline-flex items-center gap-1.5 rounded border border-[#EF4444]/35 bg-[#EF4444]/10 px-3 py-1.5 text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-[#8DA0BF]">Upload profile photo (PNG or JPG, max 5MB).</p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <input className={`w-full border rounded px-3 py-2 ${touched.firstName && fieldErrors.firstName ? 'border-red-500' : ''}`} placeholder="First Name *" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} onBlur={() => markTouched('firstName')} />
                                    {touched.firstName && fieldErrors.firstName && <p className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</p>}
                                </div>
                                <div>
                                    <input className={`w-full border rounded px-3 py-2 ${touched.lastName && fieldErrors.lastName ? 'border-red-500' : ''}`} placeholder="Last Name *" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} onBlur={() => markTouched('lastName')} />
                                    {touched.lastName && fieldErrors.lastName && <p className="text-xs text-red-600 mt-1">{fieldErrors.lastName}</p>}
                                </div>
                            </div>

                            <div>
                                <input className={`w-full border rounded px-3 py-2 ${fieldErrors.username ? 'border-red-500' : ''}`} placeholder="Username *" value={formData.username} onChange={(e) => updateField('username', e.target.value)} onBlur={() => markTouched('username')} />
                                {fieldErrors.username && <p className="text-xs text-red-600 mt-1">{fieldErrors.username}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#DCE7F5] mb-2">Bio</label>
                                <p className="text-xs text-[#8DA0BF] mb-3">Tell others about your experience, skills, or learning interests.</p>
                                {editorLoading && (
                                    <div className="animate-pulse space-y-2 border rounded p-4" style={{ height: 180 }}>
                                        <div className="h-8 bg-gray-200 rounded w-full" />
                                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 rounded w-5/6" />
                                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                                    </div>
                                )}
                                <div style={editorLoading ? { position: 'absolute', left: -9999, opacity: 0 } : {}}>
                                    <Editor
                                        apiKey={import.meta.env.VITE_TYNE_MCE_API_KEY}
                                        value={formData.bio}
                                        onEditorChange={(value) => updateField('bio', value)}
                                        onInit={() => setEditorLoading(false)}
                                        init={{
                                            height: 180,
                                            menubar: false,
                                            plugins: 'lists link',
                                            toolbar: 'undo redo | bold italic | bullist | link',
                                            tinycomments_mode: 'embedded',
                                            content_style: 'body { font-family: ui-sans-serif, system-ui; font-size: 14px; }'
                                        }}
                                    />
                                </div>
                                {touched.bio && fieldErrors.bio && <p className="text-xs text-red-600 mt-1">{fieldErrors.bio}</p>}
                                <p className="text-xs text-[#6F83A3] mt-1">{(formData.bio || '').replace(/<[^>]*>/g, '').length} / {BIO_MAX_LENGTH} characters</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#DCE7F5] mb-2">Preferred learning language</label>
                                <select
                                    className="w-full border rounded px-3 py-2"
                                    value={formData.learningLanguage}
                                    onChange={(e) => updateField('learningLanguage', e.target.value)}
                                >
                                    {languageOptions.map((lang) => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                        </section>

                        <section className="section-card space-y-5">
                            <h2 className="text-[21px] font-semibold text-[#DCE7F5]">Social Links</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">GitHub</label>
                                    <div className="relative">
                                        <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input className={`w-full border rounded py-2 pl-9 pr-3 ${touched.githubLink && fieldErrors.githubLink ? 'border-red-500' : ''}`} placeholder="https://github.com/username" value={formData.githubLink} onChange={(e) => updateField('githubLink', e.target.value)} onBlur={() => markTouched('githubLink')} />
                                    </div>
                                    {touched.githubLink && fieldErrors.githubLink && <p className="text-xs text-red-600 mt-1">{fieldErrors.githubLink}</p>}
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">LinkedIn</label>
                                    <div className="relative">
                                        <Linkedin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input className={`w-full border rounded py-2 pl-9 pr-3 ${touched.linkedinLink && fieldErrors.linkedinLink ? 'border-red-500' : ''}`} placeholder="https://linkedin.com/in/username" value={formData.linkedinLink} onChange={(e) => updateField('linkedinLink', e.target.value)} onBlur={() => markTouched('linkedinLink')} />
                                    </div>
                                    {touched.linkedinLink && fieldErrors.linkedinLink && <p className="text-xs text-red-600 mt-1">{fieldErrors.linkedinLink}</p>}
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">Portfolio</label>
                                    <div className="relative">
                                        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input className={`w-full border rounded py-2 pl-9 pr-3 ${touched.portfolioLink && fieldErrors.portfolioLink ? 'border-red-500' : ''}`} placeholder="https://your-portfolio.com" value={formData.portfolioLink} onChange={(e) => updateField('portfolioLink', e.target.value)} onBlur={() => markTouched('portfolioLink')} />
                                    </div>
                                    {touched.portfolioLink && fieldErrors.portfolioLink && <p className="text-xs text-red-600 mt-1">{fieldErrors.portfolioLink}</p>}
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">YouTube</label>
                                    <div className="relative">
                                        <Youtube className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input className={`w-full border rounded py-2 pl-9 pr-3 ${touched.youtubeLink && fieldErrors.youtubeLink ? 'border-red-500' : ''}`} placeholder="https://youtube.com/@channel" value={formData.youtubeLink} onChange={(e) => updateField('youtubeLink', e.target.value)} onBlur={() => markTouched('youtubeLink')} />
                                    </div>
                                    {touched.youtubeLink && fieldErrors.youtubeLink && <p className="text-xs text-red-600 mt-1">{fieldErrors.youtubeLink}</p>}
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <section className="section-card">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[21px] font-semibold">What I Can Teach</h2>
                                <button type="button" onClick={() => addArrayItem('teachSkills', emptyTeachSkill)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add Teach Skill</button>
                            </div>

                            <div className="space-y-4">
                                {formData.teachSkills.map((skill, index) => (
                                    <div key={`teach-${index}`} className="rounded-xl border p-5 space-y-3">
                                        <div className="grid md:grid-cols-2 gap-3">
                                            <input className="border rounded px-3 py-2" placeholder="Skill Name" value={skill.skillName} onChange={(e) => updateArrayItem('teachSkills', index, 'skillName', e.target.value)} />
                                            <select className="border rounded px-3 py-2" value={skill.level} onChange={(e) => updateArrayItem('teachSkills', index, 'level', e.target.value)}>
                                                <option value="LOW">Beginner</option>
                                                <option value="MEDIUM">Intermediate</option>
                                                <option value="HIGH">Advanced</option>
                                            </select>
                                        </div>
                                        <div>
                                            <input
                                                className={`w-full border rounded px-3 py-2 ${skill._proofUrlError ? 'border-red-500' : ''}`}
                                                placeholder="Proof Link (GitHub, Portfolio, YouTube, etc.)"
                                                value={skill.proofUrl}
                                                onChange={(e) => {
                                                    updateArrayItem('teachSkills', index, 'proofUrl', e.target.value);
                                                    // Live validate proof URL
                                                    const val = e.target.value;
                                                    const err = val && !URL_REGEX.test(val) ? 'Enter a valid URL' : null;
                                                    updateArrayItem('teachSkills', index, '_proofUrlError', err);
                                                }}
                                                onBlur={() => {
                                                    const val = skill.proofUrl;
                                                    const err = val && !URL_REGEX.test(val) ? 'Enter a valid URL' : null;
                                                    updateArrayItem('teachSkills', index, '_proofUrlError', err);
                                                }}
                                            />
                                            {skill._proofUrlError && <p className="text-xs text-red-600 mt-1">{skill._proofUrlError}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Video Demo (optional)</label>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    updateArrayItem('teachSkills', index, 'videoFile', file);
                                                    // Create local preview immediately
                                                    if (file) {
                                                        updateArrayItem('teachSkills', index, '_localPreviewUrl', URL.createObjectURL(file));
                                                    } else {
                                                        updateArrayItem('teachSkills', index, '_localPreviewUrl', '');
                                                    }
                                                }}
                                                className="text-sm"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Max 50MB. Supported: MP4, MOV</p>
                                        </div>
                                        {(skill.isUploading || skill.uploadProgress > 0) && (
                                            <div className="space-y-1">
                                                <div className="h-2 rounded bg-gray-200 overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 transition-all duration-300"
                                                        style={{ width: `${Math.min(100, skill.uploadProgress)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    {skill.isUploading ? `Uploading... ${Math.round(skill.uploadProgress)}%` : (
                                                        <span className="text-green-600 font-medium">Upload complete</span>
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                        {/* Local video preview (before upload) */}
                                        {skill._localPreviewUrl && !skill.isUploading && !skill.videoUrl && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Preview (will upload on save):</p>
                                                <video src={skill._localPreviewUrl} controls className="w-full max-h-48 rounded border" />
                                            </div>
                                        )}
                                        {/* Uploaded video preview */}
                                        {skill.videoUrl && !skill.isUploading && (
                                            <div>
                                                <p className="text-xs text-green-700 mb-1 font-medium">Video demo ready</p>
                                                <video src={skill.videoUrl} controls className="w-full max-h-48 rounded border" />
                                            </div>
                                        )}
                                        <button type="button" onClick={() => removeArrayItem('teachSkills', index)} className="text-sm text-red-600">Remove</button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="section-card">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[21px] font-semibold">What I Want To Learn</h2>
                                <button type="button" onClick={() => addArrayItem('learnSkills', emptyLearnSkill)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add Learn Skill</button>
                            </div>

                            <div className="space-y-4">
                                {formData.learnSkills.map((skill, index) => (
                                    <div key={`learn-${index}`} className="rounded-xl border p-5 space-y-3">
                                        <div className="grid md:grid-cols-2 gap-3">
                                            <input className="border rounded px-3 py-2" placeholder="Skill Name" value={skill.skillName} onChange={(e) => updateArrayItem('learnSkills', index, 'skillName', e.target.value)} />
                                            <select className="border rounded px-3 py-2" value={skill.level} onChange={(e) => updateArrayItem('learnSkills', index, 'level', e.target.value)}>
                                                <option value="LOW">Beginner</option>
                                                <option value="MEDIUM">Intermediate</option>
                                                <option value="HIGH">Advanced</option>
                                            </select>
                                        </div>
                                        <button type="button" onClick={() => removeArrayItem('learnSkills', index)} className="text-sm text-red-600">Remove</button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {step === 3 && (
                    <section className="section-card space-y-6">
                        <div>
                            <h2 className="text-[21px] font-semibold">Availability & Reminders</h2>
                            <p className="text-sm text-gray-600">Let others know when you are open to swap sessions.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <input className="border rounded px-3 py-2" placeholder="Timezone (e.g. Asia/Kolkata)" value={formData.timezone} onChange={(e) => updateField('timezone', e.target.value)} />
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={formData.emailRemindersEnabled} onChange={(e) => updateField('emailRemindersEnabled', e.target.checked)} />
                                Enable email reminders
                            </label>
                        </div>

                        <textarea
                            className="w-full border rounded px-3 py-2 min-h-25"
                            placeholder="Upcoming sessions notes"
                            value={formData.upcomingSessions}
                            onChange={(e) => updateField('upcomingSessions', e.target.value)}
                        />

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[21px] font-semibold">Weekly Availability</h2>
                                <button type="button" onClick={() => addArrayItem('availability', () => emptyAvailability(formData.timezone || 'UTC'))} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add Slot</button>
                            </div>

                            <div className="space-y-3">
                                {formData.availability.map((slot, index) => (
                                    <div key={`slot-${index}`} className="border rounded p-3 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm text-gray-700">
                                                Selected days: <span className="font-medium text-gray-900">{formatSelectedDays(slot.days || (slot.dayOfWeek ? [slot.dayOfWeek] : []))}</span>
                                            </p>
                                            <button type="button" onClick={() => removeArrayItem('availability', index)} className="text-sm text-red-600">Remove</button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setAvailabilityDays(index, WEEK_DAYS.map((day) => day.value))}
                                                className="px-2 py-1 text-xs rounded border bg-gray-50 hover:bg-gray-100"
                                            >
                                                Select All Days
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAvailabilityDays(index, [])}
                                                className="px-2 py-1 text-xs rounded border bg-gray-50 hover:bg-gray-100"
                                            >
                                                Clear Days
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                                            {WEEK_DAYS.map((day) => {
                                                const selectedDays = sortDays(slot.days || (slot.dayOfWeek ? [slot.dayOfWeek] : []));
                                                const isSelected = selectedDays.includes(day.value);
                                                return (
                                                    <label
                                                        key={`${slot.startTime}-${slot.endTime}-${day.value}-${index}`}
                                                        className={`flex items-center gap-2 border rounded px-2 py-1 text-sm cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-700'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleAvailabilityDay(index, day.value)}
                                                        />
                                                        {day.label}
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-2">
                                            <input type="time" className="border rounded px-2 py-2" value={slot.startTime} onChange={(e) => updateArrayItem('availability', index, 'startTime', e.target.value)} />
                                            <input type="time" className="border rounded px-2 py-2" value={slot.endTime} onChange={(e) => updateArrayItem('availability', index, 'endTime', e.target.value)} />
                                            <input className="border rounded px-2 py-2" value={slot.timezone} onChange={(e) => updateArrayItem('availability', index, 'timezone', e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSendReminder}
                            disabled={sendingReminder}
                            className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-60"
                        >
                            {sendingReminder ? 'Sending...' : 'Send Reminder Email Now'}
                        </button>
                    </section>
                )}

                <section className="section-card py-4">
                    <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                        className="px-4 py-2 rounded bg-gray-100 text-gray-700"
                    >
                        Previous
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => submitAll({ finalize: false })}
                            disabled={saving}
                            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : `Save ${PROFILE_STEPS.find((item) => item.id === step)?.label || 'Step'}`}
                        </button>

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                                className="px-4 py-2 rounded bg-[#0A4D9F] text-white"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => submitAll({ finalize: true })}
                                disabled={saving}
                                className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : 'Complete Profile'}
                            </button>
                        )}
                    </div>
                    </div>
                </section>

            {/* Account Management */}
            {!isSetupMode && (
                <section className="section-card border-red-200">
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700" aria-hidden="true">⚠</span>
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-gray-900">Account Management</h2>
                            <p className="text-sm leading-6 text-gray-600">
                                Manage account-level actions for your profile.
                            </p>
                            <p className="text-sm font-semibold text-red-700">Deleting your account will permanently remove your data.</p>
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteConfirmText('');
                                setDeleteDialogOpen(true);
                            }}
                            disabled={deleting}
                            className="inline-flex items-center gap-1.5 rounded border border-red-300 bg-white px-4 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                            <Trash2 className="h-4 w-4" />
                            {deleting ? 'Deleting...' : 'Delete My Account'}
                        </button>
                    </div>

                    <ConfirmDialog
                        open={deleteDialogOpen}
                        title="Confirm Account Deletion"
                        message="Please confirm that you want to permanently delete your account and all associated platform data."
                        confirmLabel={deleting ? 'Deleting...' : 'Delete Permanently'}
                        variant="danger"
                        confirmDisabled={deleteConfirmText !== 'DELETE' || deleting}
                        onConfirm={async () => {
                            if (deleteConfirmText !== 'DELETE') return;
                            setDeleteDialogOpen(false);
                            setDeleting(true);
                            try {
                                await deleteAccount();
                                toast.success('Your account has been deleted.');
                                localStorage.removeItem('token');
                                sessionStorage.removeItem('token');
                                window.location.href = '/';
                            } catch (err) {
                                toast.error(err.response?.data?.message || 'Failed to delete account');
                            } finally {
                                setDeleting(false);
                            }
                        }}
                        onCancel={() => {
                            setDeleteDialogOpen(false);
                            setDeleteConfirmText('');
                        }}
                    >
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                            ⚠ This action cannot be undone.
                        </div>
                        <label className="mt-3 block text-sm text-gray-700">
                            Type <span className="font-semibold">DELETE</span> to confirm:
                        </label>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            placeholder="DELETE"
                            autoComplete="off"
                        />
                    </ConfirmDialog>
                </section>
            )}
        </div>
        </div>
    );
};

export default Profile;
