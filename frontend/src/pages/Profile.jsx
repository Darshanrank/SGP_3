import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, sendUpcomingReminder, updateProfile, deleteAccount, getUserReviews, addSkill, createSkill, getAllSkills, getUserSkills, removeSkill, uploadSkillDemo } from '../services/profilePage.service';
import {
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
} from '../hooks/useProfileConfig';
import { Editor } from '@tinymce/tinymce-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
    ProfilePreviewSection,
    ProfileReviewsModal,
    ProfileStepProgress,
    ProfileSocialLinksSection,
    ProfileLearningGoalsSection,
    ProfilePrivacySection
} from '../components/profile';
import { Camera, Trash2 } from 'lucide-react';

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
    const [profileRating, setProfileRating] = useState({ avgRating: 0, reviewCount: 0 });
    const [earnedBadges, setEarnedBadges] = useState([]);
    const [profileUserId, setProfileUserId] = useState(null);
    const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewItems, setReviewItems] = useState([]);
    const avatarInputRef = useRef(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        bio: '',
        teachingStyles: [],
        learningGoals: [''],
        learningLanguage: '',
        githubLink: '',
        linkedinLink: '',
        portfolioLink: '',
        youtubeLink: '',
        profilePrivacy: {
            showAvailability: true,
            showPortfolio: true,
            showSocialLinks: true
        },
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
                setProfileUserId(profileData.userId || null);
                setProfileRating({
                    avgRating: Number(profileData?.headerStats?.rating || profileData?.reputationMetrics?.averageRating || 0),
                    reviewCount: Number(profileData?.headerStats?.reviewCount || profileData?.reputationMetrics?.reviewCount || 0)
                });
                setEarnedBadges(Array.isArray(profileData?.badges) ? profileData.badges : []);
                const selectedTeachingStyles = parseTeachingStyles(profile);
                const goals = Array.isArray(profileData.learningGoals) && profileData.learningGoals.length
                    ? profileData.learningGoals.map((goal) => String(goal.goalText || '').trim()).filter(Boolean)
                    : [''];
                const privacy = profileData.profilePrivacy || {};

                const timezone = profile.timezone || 'UTC';
                const { firstName, lastName } = splitFullName(profile.fullName || '');

                setFormData({
                    firstName,
                    lastName,
                    username: String(profileData.username || '').toLowerCase(),
                    bio: profile.bio || '',
                    teachingStyles: selectedTeachingStyles,
                    learningGoals: goals,
                    learningLanguage: profile.learningLanguage || 'English',
                    githubLink: profile.githubLink || '',
                    linkedinLink: profile.linkedinLink || '',
                    portfolioLink: profile.portfolioLink || '',
                    youtubeLink: profile.youtubeLink || '',
                    profilePrivacy: {
                        showAvailability: typeof privacy.showAvailability === 'boolean' ? privacy.showAvailability : true,
                        showPortfolio: typeof privacy.showPortfolio === 'boolean' ? privacy.showPortfolio : true,
                        showSocialLinks: typeof privacy.showSocialLinks === 'boolean' ? privacy.showSocialLinks : true
                    },
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
            case 'teachingStyles':
                if (!Array.isArray(value) || value.length < 1) error = 'Please select at least one teaching style.';
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
        errs.teachingStyles = validateField('teachingStyles', formData.teachingStyles);
        errs.githubLink = validateField('githubLink', formData.githubLink);
        errs.linkedinLink = validateField('linkedinLink', formData.linkedinLink);
        errs.portfolioLink = validateField('portfolioLink', formData.portfolioLink);
        errs.youtubeLink = validateField('youtubeLink', formData.youtubeLink);
        // Mark all as touched to show errors
        setTouched({ firstName: true, lastName: true, username: true, bio: true, teachingStyles: true, githubLink: true, linkedinLink: true, portfolioLink: true, youtubeLink: true });
        return Object.values(errs).some(Boolean);
    };

    const toggleTeachingStyle = (style) => {
        setTouched((prev) => ({ ...prev, teachingStyles: true }));
        setFormData((prev) => {
            const alreadySelected = prev.teachingStyles.includes(style);
            const nextStyles = alreadySelected
                ? prev.teachingStyles.filter((item) => item !== style)
                : [...prev.teachingStyles, style];

            validateField('teachingStyles', nextStyles);
            return { ...prev, teachingStyles: nextStyles };
        });
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

    const addLearningGoal = () => {
        setFormData((prev) => ({ ...prev, learningGoals: [...prev.learningGoals, ''] }));
    };

    const updateLearningGoal = (index, value) => {
        setFormData((prev) => {
            const goals = [...prev.learningGoals];
            goals[index] = value;
            return { ...prev, learningGoals: goals };
        });
    };

    const removeLearningGoal = (index) => {
        setFormData((prev) => {
            const goals = prev.learningGoals.filter((_, idx) => idx !== index);
            return { ...prev, learningGoals: goals.length ? goals : [''] };
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
            profilePayload.append('teachingStyles', JSON.stringify(formData.teachingStyles));
            profilePayload.append('learningGoals', JSON.stringify(formData.learningGoals.filter((goal) => String(goal || '').trim())));
            profilePayload.append('learningLanguage', formData.learningLanguage);
            profilePayload.append('githubLink', formData.githubLink);
            profilePayload.append('linkedinLink', formData.linkedinLink);
            profilePayload.append('portfolioLink', formData.portfolioLink);
            profilePayload.append('youtubeLink', formData.youtubeLink);
            profilePayload.append('profilePrivacy', JSON.stringify(formData.profilePrivacy));
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

            // Remove old skills that are no longer in the form.
            // Keep explicit error handling so users know when backend constraints block deletion.
            const removed = existingUserSkills.filter((item) => !retainedSkillIds.has(item.id));
            const removeFailures = [];

            for (const item of removed) {
                try {
                    await removeSkill(item.id);
                } catch (err) {
                    removeFailures.push(err?.response?.data?.message || `Failed to remove skill #${item.id}`);
                }
            }

            const updatedUser = await refreshUser();
            if (skillSaveErrors > 0 || removeFailures.length > 0) {
                if (skillSaveErrors > 0) {
                    toast.error(`${skillSaveErrors} skill(s) could not be saved. Please try again.`);
                }

                if (removeFailures.length > 0) {
                    const uniqueRemovalMessages = [...new Set(removeFailures)];
                    const baseMessage = `${removeFailures.length} skill(s) could not be removed.`;
                    const detailMessage = uniqueRemovalMessages[0] ? ` ${uniqueRemovalMessages[0]}` : '';
                    toast.error(`${baseMessage}${detailMessage}`);
                }
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
                setProfileUserId(freshProfile.userId || null);
                setProfileRating({
                    avgRating: Number(freshProfile?.headerStats?.rating || freshProfile?.reputationMetrics?.averageRating || 0),
                    reviewCount: Number(freshProfile?.headerStats?.reviewCount || freshProfile?.reputationMetrics?.reviewCount || 0)
                });
                setEarnedBadges(Array.isArray(freshProfile?.badges) ? freshProfile.badges : []);

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
                const refreshedTeachingStyles = parseTeachingStyles(profile);
                setFormData((prev) => ({
                    ...prev,
                    avatarUrl: profile.avatarUrl || prev.avatarUrl,
                    avatarFile: null,
                    teachingStyles: refreshedTeachingStyles.length ? refreshedTeachingStyles : prev.teachingStyles,
                    learningGoals: Array.isArray(freshProfile.learningGoals) && freshProfile.learningGoals.length
                        ? freshProfile.learningGoals.map((goal) => String(goal.goalText || '').trim()).filter(Boolean)
                        : [''],
                    profilePrivacy: freshProfile.profilePrivacy || prev.profilePrivacy,
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

    const handleOpenReviews = async () => {
        if (!profileUserId || reviewsLoading) return;

        setReviewsModalOpen(true);
        if (reviewItems.length) return;

        setReviewsLoading(true);
        try {
            const response = await getUserReviews(profileUserId, 1, 10);
            setReviewItems(Array.isArray(response?.data) ? response.data : []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load reviews');
        } finally {
            setReviewsLoading(false);
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
        <div className={profileContainerClass}>
                <ProfileReviewsModal
                    reviewsModalOpen={reviewsModalOpen}
                    setReviewsModalOpen={setReviewsModalOpen}
                    reviewsLoading={reviewsLoading}
                    reviewItems={reviewItems}
                    renderStarRow={renderStarRow}
                />

                <ProfilePreviewSection
                    avatarPreview={avatarPreview}
                    formData={formData}
                    composeFullName={composeFullName}
                    profileRating={profileRating}
                    handleOpenReviews={handleOpenReviews}
                    earnedBadges={earnedBadges}
                />

                <ProfileStepProgress
                    profileCardClass={profileCardClass}
                    step={step}
                    profileSteps={PROFILE_STEPS}
                    setStep={setStep}
                />

                {step === 1 && (
                    <div className="space-y-6">
                        <section className={`${profileCardClass} space-y-6`}>
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

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <input className={`w-full border rounded px-3 py-2 ${touched.firstName && fieldErrors.firstName ? 'border-red-500/50' : ''}`} placeholder="First Name *" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} onBlur={() => markTouched('firstName')} />
                                    {touched.firstName && fieldErrors.firstName && <p className="text-xs text-red-400 mt-1">{fieldErrors.firstName}</p>}
                                </div>
                                <div>
                                    <input className={`w-full border rounded px-3 py-2 ${touched.lastName && fieldErrors.lastName ? 'border-red-500/50' : ''}`} placeholder="Last Name *" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} onBlur={() => markTouched('lastName')} />
                                    {touched.lastName && fieldErrors.lastName && <p className="text-xs text-red-400 mt-1">{fieldErrors.lastName}</p>}
                                </div>
                            </div>

                            <div>
                                <input className={`w-full border rounded px-3 py-2 ${fieldErrors.username ? 'border-red-500/50' : ''}`} placeholder="Username *" value={formData.username} onChange={(e) => updateField('username', e.target.value)} onBlur={() => markTouched('username')} />
                                {fieldErrors.username && <p className="text-xs text-red-400 mt-1">{fieldErrors.username}</p>}
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
                                {touched.bio && fieldErrors.bio && <p className="text-xs text-red-400 mt-1">{fieldErrors.bio}</p>}
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

                            <div>
                                <label className="block text-sm font-medium text-[#DCE7F5] mb-2">Teaching Style</label>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                    {teachingStyleOptions.map((style) => {
                                        const selected = formData.teachingStyles.includes(style);
                                        return (
                                            <label
                                                key={style}
                                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${selected ? 'border-[#0A4D9F] bg-[#0A4D9F]/20 text-[#DCE7F5]' : 'border-white/10 text-[#8DA0BF] hover:bg-[#151D27]'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleTeachingStyle(style)}
                                                    className="h-4 w-4"
                                                />
                                                <span>{style}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {formData.teachingStyles.length > 0 && (
                                    <div className="mt-3">
                                        <p className="mb-2 text-xs uppercase tracking-wide text-[#8DA0BF]">Selected Styles</p>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.teachingStyles.map((style) => (
                                                <span key={style} className="rounded-full bg-blue-900/30 px-3 py-1 text-sm text-blue-300">
                                                    {style}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {touched.teachingStyles && fieldErrors.teachingStyles && (
                                    <p className="mt-2 text-xs text-red-400">{fieldErrors.teachingStyles}</p>
                                )}
                            </div>
                        </section>

                        <ProfileSocialLinksSection
                            profileCardClass={profileCardClass}
                            formData={formData}
                            touched={touched}
                            fieldErrors={fieldErrors}
                            updateField={updateField}
                            markTouched={markTouched}
                        />

                        <ProfileLearningGoalsSection
                            profileCardClass={profileCardClass}
                            learningGoals={formData.learningGoals}
                            addLearningGoal={addLearningGoal}
                            updateLearningGoal={updateLearningGoal}
                            removeLearningGoal={removeLearningGoal}
                        />

                        <ProfilePrivacySection
                            profileCardClass={profileCardClass}
                            profilePrivacy={formData.profilePrivacy}
                            setFormData={setFormData}
                        />
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <section className={profileCardClass}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[21px] font-semibold">What I Can Teach</h2>
                                <button type="button" onClick={() => addArrayItem('teachSkills', emptyTeachSkill)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add Teach Skill</button>
                            </div>

                            <div className="space-y-4">
                                {formData.teachSkills.map((skill, index) => (
                                    <div key={`teach-${index}`} className="space-y-3 rounded-lg border border-white/10 p-4">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <input className="border rounded px-3 py-2" placeholder="Skill Name" value={skill.skillName} onChange={(e) => updateArrayItem('teachSkills', index, 'skillName', e.target.value)} />
                                            <select className="border rounded px-3 py-2" value={skill.level} onChange={(e) => updateArrayItem('teachSkills', index, 'level', e.target.value)}>
                                                <option value="LOW">Beginner</option>
                                                <option value="MEDIUM">Intermediate</option>
                                                <option value="HIGH">Advanced</option>
                                            </select>
                                        </div>
                                        <div>
                                            <input
                                                className={`w-full border rounded px-3 py-2 ${skill._proofUrlError ? 'border-red-500/50' : ''}`}
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
                                            {skill._proofUrlError && <p className="text-xs text-red-400 mt-1">{skill._proofUrlError}</p>}
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
                                        <button type="button" onClick={() => removeArrayItem('teachSkills', index)} className="text-sm text-red-400 hover:text-red-300">Remove</button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={profileCardClass}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[21px] font-semibold">What I Want To Learn</h2>
                                <button type="button" onClick={() => addArrayItem('learnSkills', emptyLearnSkill)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add Learn Skill</button>
                            </div>

                            <div className="space-y-4">
                                {formData.learnSkills.map((skill, index) => (
                                    <div key={`learn-${index}`} className="space-y-3 rounded-lg border border-white/10 p-4">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <input className="border rounded px-3 py-2" placeholder="Skill Name" value={skill.skillName} onChange={(e) => updateArrayItem('learnSkills', index, 'skillName', e.target.value)} />
                                            <select className="border rounded px-3 py-2" value={skill.level} onChange={(e) => updateArrayItem('learnSkills', index, 'level', e.target.value)}>
                                                <option value="LOW">Beginner</option>
                                                <option value="MEDIUM">Intermediate</option>
                                                <option value="HIGH">Advanced</option>
                                            </select>
                                        </div>
                                        <button type="button" onClick={() => removeArrayItem('learnSkills', index)} className="text-sm text-red-400 hover:text-red-300">Remove</button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {step === 3 && (
                    <section className={`${profileCardClass} flex flex-col gap-4`}>
                        <div>
                            <h2 className="text-[21px] font-semibold">Availability & Reminders</h2>
                            <p className="text-sm text-gray-600">Let others know when you are open to swap sessions.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                            <button type="button" onClick={() => removeArrayItem('availability', index)} className="text-sm text-red-400 hover:text-red-300">Remove</button>
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

                                        <div className="grid grid-cols-7 gap-2">
                                            {WEEK_DAYS.map((day) => {
                                                const selectedDays = sortDays(slot.days || (slot.dayOfWeek ? [slot.dayOfWeek] : []));
                                                const isSelected = selectedDays.includes(day.value);
                                                return (
                                                    <label
                                                        key={`${slot.startTime}-${slot.endTime}-${day.value}-${index}`}
                                                        className={`cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-center text-sm ${isSelected ? 'bg-[#0A4D9F]/20 text-[#7BB2FF]' : 'text-[#8DA0BF]'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleAvailabilityDay(index, day.value)}
                                                            className="hidden"
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

                <section className={`${profileCardClass} py-4`}>
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
                                className="px-4 py-2 rounded bg-green-500/20 text-green-400 disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : 'Complete Profile'}
                            </button>
                        )}
                    </div>
                    </div>
                </section>

            {/* Account Management */}
            {!isSetupMode && (
                <section className={`${profileCardClass} border border-red-200/30`}>
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
    );
};

export default Profile;
