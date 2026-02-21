import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, sendUpcomingReminder, updateProfile } from '../services/profile.service';
import { addSkill, createSkill, getAllSkills, getUserSkills, removeSkill, uploadSkillDemo } from '../services/skill.service';
import { Editor } from '@tinymce/tinymce-react';

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

                await addSkill({
                    skillId,
                    type: 'TEACH',
                    level: teachSkill.level,
                    proofUrl: teachSkill.proofUrl,
                    preview: {
                        videoUrl,
                        description: `Skill demo for ${teachSkill.skillName}`,
                        syllabusOutline: ''
                    }
                });

                if (teachSkill.id) retainedSkillIds.add(teachSkill.id);
            }

            for (const learnSkill of formData.learnSkills) {
                if (!learnSkill.skillName.trim()) continue;

                const skillId = learnSkill.skillId || await resolveSkillId(learnSkill.skillName);
                if (!skillId) continue;

                await addSkill({
                    skillId,
                    type: 'LEARN',
                    level: learnSkill.level
                });

                if (learnSkill.id) retainedSkillIds.add(learnSkill.id);
            }

            const removed = existingUserSkills.filter((item) => !retainedSkillIds.has(item.id));
            for (const item of removed) {
                await removeSkill(item.id);
            }

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
                            <input className="border rounded px-3 py-2" placeholder="Full Name" value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
                            <input className="border rounded px-3 py-2" placeholder="Username" value={formData.username} onChange={(e) => updateField('username', e.target.value)} />
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
                            <input className="border rounded px-3 py-2" placeholder="GitHub (optional)" value={formData.githubLink} onChange={(e) => updateField('githubLink', e.target.value)} />
                            <input className="border rounded px-3 py-2" placeholder="LinkedIn (optional)" value={formData.linkedinLink} onChange={(e) => updateField('linkedinLink', e.target.value)} />
                            <input className="border rounded px-3 py-2" placeholder="Portfolio (optional)" value={formData.portfolioLink} onChange={(e) => updateField('portfolioLink', e.target.value)} />
                            <input className="border rounded px-3 py-2" placeholder="YouTube (optional)" value={formData.youtubeLink} onChange={(e) => updateField('youtubeLink', e.target.value)} />
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
        </div>
    );
};

export default Profile;
