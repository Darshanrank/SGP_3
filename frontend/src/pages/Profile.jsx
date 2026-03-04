import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, sendUpcomingReminder, updateProfile, deleteAccount } from '../services/profile.service';
import { addSkill, createSkill, getAllSkills, getUserSkills, removeSkill, uploadSkillDemo } from '../services/skill.service';
import { Editor } from '@tinymce/tinymce-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

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
const emptyAvailability = (timezone = 'UTC') => ({ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00', timezone });

const languageOptions = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Chinese', 'Japanese'];

const BIO_MAX_LENGTH = 2000;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const URL_REGEX = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;

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
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
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

                setFormData({
                    fullName: profile.fullName || '',
                    username: profileData.username || '',
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
                        ? profileData.availability.map((slot) => ({
                            dayOfWeek: slot.dayOfWeek,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            timezone: slot.timezone || timezone
                        }))
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
        setFormData((prev) => ({ ...prev, [key]: value }));
        // Live validation
        validateField(key, value);
    };

    const markTouched = (key) => {
        setTouched((prev) => ({ ...prev, [key]: true }));
        validateField(key, formData[key]);
    };

    const validateField = (key, value) => {
        let error = null;
        switch (key) {
            case 'fullName':
                if (!value?.trim()) error = 'Full name is required';
                break;
            case 'username':
                if (!value?.trim()) error = 'Username is required';
                else if (value.trim().length < USERNAME_MIN) error = `At least ${USERNAME_MIN} characters`;
                else if (value.trim().length > USERNAME_MAX) error = `Max ${USERNAME_MAX} characters`;
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
        errs.fullName = validateField('fullName', formData.fullName);
        errs.username = validateField('username', formData.username);
        errs.bio = validateField('bio', formData.bio);
        errs.githubLink = validateField('githubLink', formData.githubLink);
        errs.linkedinLink = validateField('linkedinLink', formData.linkedinLink);
        errs.portfolioLink = validateField('portfolioLink', formData.portfolioLink);
        errs.youtubeLink = validateField('youtubeLink', formData.youtubeLink);
        // Mark all as touched to show errors
        setTouched({ fullName: true, username: true, bio: true, githubLink: true, linkedinLink: true, portfolioLink: true, youtubeLink: true });
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

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        updateField('avatarFile', file);
        setAvatarPreview(URL.createObjectURL(file));
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
        } catch (_) {
            const retry = await getAllSkills(1, 50, normalizedName);
            const retryMatch = retry.data?.find((skill) => skill.name.toLowerCase() === normalizedName.toLowerCase());
            return retryMatch?.id || null;
        }
    };

    const submitAll = async () => {
        if (hasValidationErrors()) {
            toast.error('Please fix the highlighted errors before saving');
            return;
        }
        setSaving(true);
        try {
            const profilePayload = new FormData();
            profilePayload.append('fullName', formData.fullName);
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
            profilePayload.append('profileCompleted', 'true');
            profilePayload.append('availability', JSON.stringify(formData.availability));

            if (formData.avatarFile) {
                profilePayload.append('avatar', formData.avatarFile);
            }

            await updateProfile(profilePayload);

            const retainedSkillIds = new Set();

            // Prepare teach skills (uploads must be sequential per-skill, but
            // we can prepare all payloads first, then batch the addSkill calls)
            const teachPayloads = [];
            for (let i = 0; i < formData.teachSkills.length; i += 1) {
                const teachSkill = formData.teachSkills[i];
                if (!teachSkill.skillName.trim()) continue;

                const skillId = teachSkill.skillId || await resolveSkillId(teachSkill.skillName);
                if (!skillId) continue;

                let videoUrl = teachSkill.videoUrl;
                if (teachSkill.videoFile) {
                    updateTeachSkillUpload(i, { isUploading: true, uploadProgress: 0 });
                    const uploaded = await uploadSkillDemo(teachSkill.videoFile, (progress) => {
                        updateTeachSkillUpload(i, { uploadProgress: progress });
                    });
                    videoUrl = uploaded.url;
                    updateTeachSkillUpload(i, { isUploading: false, uploadProgress: 100, videoUrl });
                }

                teachPayloads.push({
                    skillId,
                    type: 'TEACH',
                    level: teachSkill.level,
                    proofUrl: teachSkill.proofUrl,
                    preview: {
                        videoUrl,
                        description: `Skill demo for ${teachSkill.skillName}`,
                        syllabusOutline: ''
                    },
                    _retainId: teachSkill.id
                });
            }

            // Prepare learn skills payloads
            const learnPayloads = [];
            for (const learnSkill of formData.learnSkills) {
                if (!learnSkill.skillName.trim()) continue;
                const skillId = learnSkill.skillId || await resolveSkillId(learnSkill.skillName);
                if (!skillId) continue;
                learnPayloads.push({
                    skillId,
                    type: 'LEARN',
                    level: learnSkill.level,
                    _retainId: learnSkill.id
                });
            }

            // Batch all addSkill calls in parallel
            const allPayloads = [...teachPayloads, ...learnPayloads];
            const results = await Promise.all(
                allPayloads.map(({ _retainId, ...payload }) => addSkill(payload).then(() => _retainId))
            );
            results.forEach(retainId => { if (retainId) retainedSkillIds.add(retainId); });

            // Batch all removeSkill calls in parallel
            const removed = existingUserSkills.filter((item) => !retainedSkillIds.has(item.id));
            await Promise.all(removed.map(item => removeSkill(item.id)));

            await refreshUser();
            toast.success('Profile setup saved successfully');

            if (isSetupMode) {
                navigate('/dashboard', { replace: true });
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
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
                <p className="text-sm text-gray-600 mt-1">Step {step} of 3</p>

                <div className="mt-6 grid grid-cols-3 gap-2 text-sm">
                    <button type="button" onClick={() => setStep(1)} className={`py-2 rounded ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>1. Basic Info</button>
                    <button type="button" onClick={() => setStep(2)} className={`py-2 rounded ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>2. Skills</button>
                    <button type="button" onClick={() => setStep(3)} className={`py-2 rounded ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>3. Time Slots</button>
                </div>

                {step === 1 && (
                    <div className="mt-6 space-y-5">
                        <div className="flex items-center gap-4">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar Preview" className="h-16 w-16 rounded-full object-cover" />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">U</div>
                            )}
                            <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <input className={`w-full border rounded px-3 py-2 ${touched.fullName && fieldErrors.fullName ? 'border-red-500' : ''}`} placeholder="Full Name *" value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} onBlur={() => markTouched('fullName')} />
                                {touched.fullName && fieldErrors.fullName && <p className="text-xs text-red-600 mt-1">{fieldErrors.fullName}</p>}
                            </div>
                            <div>
                                <input className={`w-full border rounded px-3 py-2 ${touched.username && fieldErrors.username ? 'border-red-500' : ''}`} placeholder="Username *" value={formData.username} onChange={(e) => updateField('username', e.target.value)} onBlur={() => markTouched('username')} />
                                {touched.username && fieldErrors.username && <p className="text-xs text-red-600 mt-1">{fieldErrors.username}</p>}
                                {!fieldErrors.username && formData.username && <p className="text-xs text-gray-400 mt-1">{formData.username.length}/{USERNAME_MAX}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                            <Editor
                                apiKey={import.meta.env.VITE_TYNE_MCE_API_KEY}
                                value={formData.bio}
                                onEditorChange={(value) => updateField('bio', value)}
                                init={{
                                    height: 220,
                                    menubar: false,
                                    plugins: 'lists link emoticons',
                                    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
        tinycomments_mode: 'embedded',
                                    content_style: 'body { font-family: ui-sans-serif, system-ui; font-size: 14px; }'
                                }}
                            />
                            {touched.bio && fieldErrors.bio && <p className="text-xs text-red-600 mt-1">{fieldErrors.bio}</p>}
                            <p className="text-xs text-gray-400 mt-1">{(formData.bio || '').replace(/<[^>]*>/g, '').length} / {BIO_MAX_LENGTH} characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred learning language</label>
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

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <input className={`w-full border rounded px-3 py-2 ${touched.githubLink && fieldErrors.githubLink ? 'border-red-500' : ''}`} placeholder="GitHub (optional)" value={formData.githubLink} onChange={(e) => updateField('githubLink', e.target.value)} onBlur={() => markTouched('githubLink')} />
                                {touched.githubLink && fieldErrors.githubLink && <p className="text-xs text-red-600 mt-1">{fieldErrors.githubLink}</p>}
                            </div>
                            <div>
                                <input className={`w-full border rounded px-3 py-2 ${touched.linkedinLink && fieldErrors.linkedinLink ? 'border-red-500' : ''}`} placeholder="LinkedIn (optional)" value={formData.linkedinLink} onChange={(e) => updateField('linkedinLink', e.target.value)} onBlur={() => markTouched('linkedinLink')} />
                                {touched.linkedinLink && fieldErrors.linkedinLink && <p className="text-xs text-red-600 mt-1">{fieldErrors.linkedinLink}</p>}
                            </div>
                            <div>
                                <input className={`w-full border rounded px-3 py-2 ${touched.portfolioLink && fieldErrors.portfolioLink ? 'border-red-500' : ''}`} placeholder="Portfolio (optional)" value={formData.portfolioLink} onChange={(e) => updateField('portfolioLink', e.target.value)} onBlur={() => markTouched('portfolioLink')} />
                                {touched.portfolioLink && fieldErrors.portfolioLink && <p className="text-xs text-red-600 mt-1">{fieldErrors.portfolioLink}</p>}
                            </div>
                            <div>
                                <input className={`w-full border rounded px-3 py-2 ${touched.youtubeLink && fieldErrors.youtubeLink ? 'border-red-500' : ''}`} placeholder="YouTube (optional)" value={formData.youtubeLink} onChange={(e) => updateField('youtubeLink', e.target.value)} onBlur={() => markTouched('youtubeLink')} />
                                {touched.youtubeLink && fieldErrors.youtubeLink && <p className="text-xs text-red-600 mt-1">{fieldErrors.youtubeLink}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="mt-6 space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold">What I Can Teach</h2>
                                <button type="button" onClick={() => addArrayItem('teachSkills', emptyTeachSkill)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add Teach Skill</button>
                            </div>

                            <div className="space-y-4">
                                {formData.teachSkills.map((skill, index) => (
                                    <div key={`teach-${index}`} className="border rounded p-4 space-y-3">
                                        <div className="grid md:grid-cols-2 gap-3">
                                            <input className="border rounded px-3 py-2" placeholder="Skill Name" value={skill.skillName} onChange={(e) => updateArrayItem('teachSkills', index, 'skillName', e.target.value)} />
                                            <select className="border rounded px-3 py-2" value={skill.level} onChange={(e) => updateArrayItem('teachSkills', index, 'level', e.target.value)}>
                                                <option value="LOW">Beginner</option>
                                                <option value="MEDIUM">Intermediate</option>
                                                <option value="HIGH">Advanced</option>
                                            </select>
                                        </div>
                                        <input className="w-full border rounded px-3 py-2" placeholder="Skill Proof Link" value={skill.proofUrl} onChange={(e) => updateArrayItem('teachSkills', index, 'proofUrl', e.target.value)} />
                                        <div className="grid md:grid-cols-2 gap-3 items-center">
                                            <input type="file" accept="video/*" onChange={(e) => updateArrayItem('teachSkills', index, 'videoFile', e.target.files?.[0] || null)} className="text-sm" />
                                            <input className="border rounded px-3 py-2" placeholder="Or existing demo video URL" value={skill.videoUrl} onChange={(e) => updateArrayItem('teachSkills', index, 'videoUrl', e.target.value)} />
                                        </div>
                                        {(skill.isUploading || skill.uploadProgress > 0) && (
                                            <div className="space-y-1">
                                                <div className="h-2 rounded bg-gray-200 overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600"
                                                        style={{ width: `${Math.min(100, skill.uploadProgress)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    {skill.isUploading ? `Uploading... ${Math.round(skill.uploadProgress)}%` : 'Upload complete'}
                                                </p>
                                            </div>
                                        )}
                                        {skill.videoUrl && !skill.isUploading && (
                                            <p className="text-xs text-green-700">Video demo ready</p>
                                        )}
                                        <button type="button" onClick={() => removeArrayItem('teachSkills', index)} className="text-sm text-red-600">Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold">What I Want To Learn</h2>
                                <button type="button" onClick={() => addArrayItem('learnSkills', emptyLearnSkill)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add Learn Skill</button>
                            </div>

                            <div className="space-y-4">
                                {formData.learnSkills.map((skill, index) => (
                                    <div key={`learn-${index}`} className="border rounded p-4 space-y-3">
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
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="mt-6 space-y-5">
                        <div>
                            <h2 className="text-lg font-semibold">Availability & Reminders</h2>
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
                                <h2 className="text-lg font-semibold">Weekly Availability</h2>
                                <button type="button" onClick={() => addArrayItem('availability', () => emptyAvailability(formData.timezone || 'UTC'))} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add Slot</button>
                            </div>

                            <div className="space-y-3">
                                {formData.availability.map((slot, index) => (
                                    <div key={`slot-${index}`} className="grid md:grid-cols-5 gap-2 items-center border rounded p-3">
                                        <select className="border rounded px-2 py-2" value={slot.dayOfWeek} onChange={(e) => updateArrayItem('availability', index, 'dayOfWeek', e.target.value)}>
                                            <option value="MONDAY">Monday</option>
                                            <option value="TUESDAY">Tuesday</option>
                                            <option value="WEDNESDAY">Wednesday</option>
                                            <option value="THURSDAY">Thursday</option>
                                            <option value="FRIDAY">Friday</option>
                                            <option value="SATURDAY">Saturday</option>
                                            <option value="SUNDAY">Sunday</option>
                                        </select>
                                        <input type="time" className="border rounded px-2 py-2" value={slot.startTime} onChange={(e) => updateArrayItem('availability', index, 'startTime', e.target.value)} />
                                        <input type="time" className="border rounded px-2 py-2" value={slot.endTime} onChange={(e) => updateArrayItem('availability', index, 'endTime', e.target.value)} />
                                        <input className="border rounded px-2 py-2" value={slot.timezone} onChange={(e) => updateArrayItem('availability', index, 'timezone', e.target.value)} />
                                        <button type="button" onClick={() => removeArrayItem('availability', index)} className="text-sm text-red-600">Remove</button>
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
                    </div>
                )}

                <div className="mt-8 flex justify-between">
                    <button
                        type="button"
                        onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                        className="px-4 py-2 rounded bg-gray-100 text-gray-700"
                    >
                        Previous
                    </button>

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                            className="px-4 py-2 rounded bg-blue-600 text-white"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={submitAll}
                            disabled={saving}
                            className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : 'Save Profile Setup'}
                        </button>
                    )}
                </div>
            </div>

            {/* Danger Zone — Delete Account */}
            {!isSetupMode && (
                <div className="mt-8 bg-white rounded-xl shadow-sm border border-red-200 p-6">
                    <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
                    <p className="text-sm text-gray-600 mt-1">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <button
                        type="button"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={deleting}
                        className="mt-4 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        {deleting ? 'Deleting...' : 'Delete My Account'}
                    </button>
                    <ConfirmDialog
                        open={deleteDialogOpen}
                        title="Delete Account"
                        message="This will permanently delete your account, all your skills, swap history, messages, and reviews. This cannot be undone. Are you absolutely sure?"
                        confirmLabel="Delete Everything"
                        variant="danger"
                        onConfirm={async () => {
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
                        onCancel={() => setDeleteDialogOpen(false)}
                    />
                </div>
            )}
        </div>
    );
};

export default Profile;
