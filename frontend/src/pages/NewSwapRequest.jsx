import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { createSwapRequest, getMyRequests } from '../services/swap.service';
import { getUserSkills } from '../services/skill.service';
import { getPublicProfileByUsername } from '../services/profile.service';
import { getMatchedUsers } from '../services/matching.service';
import { Button } from '../components/ui/Button';
import { Search, ArrowRightLeft, Send, ChevronLeft, User, BookOpen, GraduationCap, X, Play, ExternalLink } from 'lucide-react';

const levelLabel = { LOW: 'Beginner', MEDIUM: 'Intermediate', HIGH: 'Advanced' };
const levelColor = { LOW: 'bg-blue-100 text-blue-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-green-100 text-green-700' };

const MESSAGE_MAX = 1000;

const NewSwapRequest = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    // URL params for pre-filling
    const prefilledUsername = searchParams.get('to') || '';
    const prefilledSkillId = searchParams.get('skillId') || '';

    // Step: 1 = select user, 2 = select skills & send
    const [step, setStep] = useState(prefilledUsername ? 2 : 1);

    // Step 1 state
    const [userSearch, setUserSearch] = useState('');

    // Step 2 state
    const [targetUsername, setTargetUsername] = useState(prefilledUsername);
    const [targetProfile, setTargetProfile] = useState(null);
    const [loadingTarget, setLoadingTarget] = useState(false);
    const [selectedLearnSkillId, setSelectedLearnSkillId] = useState(prefilledSkillId ? parseInt(prefilledSkillId, 10) : null);
    const [selectedTeachSkillId, setSelectedTeachSkillId] = useState(null);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [previewSkill, setPreviewSkill] = useState(null);

    // Fetch matched users for step 1 suggestions
    const { data: matchedData, isLoading: loadingMatches } = useQuery({
        queryKey: ['matchedUsers'],
        queryFn: () => getMatchedUsers(1, 50),
        staleTime: 60000,
        enabled: step === 1,
    });

    // Fetch my own skills (TEACH type for offering)
    const { data: mySkills = [], isLoading: loadingMySkills } = useQuery({
        queryKey: ['mySkills'],
        queryFn: getUserSkills,
        staleTime: 60000,
    });

    const myTeachSkills = useMemo(() => (mySkills || []).filter(s => s.type === 'TEACH'), [mySkills]);

    // Fetch sent pending requests to check duplicates
    const { data: sentRequestsData } = useQuery({
        queryKey: ['swaps', 'sent'],
        queryFn: async () => {
            const res = await getMyRequests('sent', 1, 100);
            return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        },
        staleTime: 30000,
    });

    const pendingRequestForSkill = useMemo(() => {
        const requests = Array.isArray(sentRequestsData) ? sentRequestsData : [];
        if (!targetProfile?.userId || !selectedLearnSkillId) return null;
        return requests.find(r => r.status === 'PENDING' && r.toUserId === targetProfile.userId && r.learnSkillId === selectedLearnSkillId) || null;
    }, [sentRequestsData, targetProfile?.userId, selectedLearnSkillId]);

    const matchedUsers = useMemo(() => matchedData?.data || [], [matchedData]);

    // Filter matched users by search
    const filteredUsers = useMemo(() => {
        if (!userSearch.trim()) return matchedUsers;
        const q = userSearch.toLowerCase();
        return matchedUsers.filter(u =>
            u.username?.toLowerCase().includes(q) ||
            u.fullName?.toLowerCase().includes(q)
        );
    }, [matchedUsers, userSearch]);

    // Load target user profile when username is set
    useEffect(() => {
        if (!targetUsername) return;

        const loadTarget = async () => {
            setLoadingTarget(true);
            try {
                const data = await getPublicProfileByUsername(targetUsername);
                setTargetProfile(data);

                // If pre-filled skillId, validate it exists
                if (prefilledSkillId) {
                    const teachSkills = (data.userSkills || []).filter(s => s.type === 'TEACH');
                    const found = teachSkills.find(s => s.id === parseInt(prefilledSkillId, 10));
                    if (found) {
                        setSelectedLearnSkillId(found.id);
                    }
                }
            } catch (err) {
                toast.error('User not found');
                setStep(1);
                setTargetUsername('');
            } finally {
                setLoadingTarget(false);
            }
        };

        loadTarget();
    }, [targetUsername, prefilledSkillId]);

    const targetTeachSkills = useMemo(
        () => (targetProfile?.userSkills || []).filter(s => s.type === 'TEACH'),
        [targetProfile]
    );

    const handleSelectUser = (username) => {
        setTargetUsername(username);
        setSelectedLearnSkillId(null);
        setSelectedTeachSkillId(null);
        setMessage('');
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!targetProfile?.userId) {
            toast.error('Please select a user');
            return;
        }
        if (!selectedLearnSkillId) {
            toast.error('Please select a skill you want to learn');
            return;
        }

        setSubmitting(true);
        try {
            await createSwapRequest({
                toUserId: targetProfile.userId,
                learnSkillId: selectedLearnSkillId,
                teachSkillId: selectedTeachSkillId || undefined,
                message: message.trim() || undefined,
            });
            toast.success('Swap request sent successfully!');
            navigate('/swaps', { replace: true });
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to send swap request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button type="button" onClick={() => step === 1 ? navigate('/swaps') : (setStep(1), setTargetProfile(null), setTargetUsername(''))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">New Swap Request</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {step === 1 ? 'Choose who you want to swap skills with' : `Sending request to @${targetUsername}`}
                    </p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    <User className="h-4 w-4" />
                    1. Select User
                </div>
                <div className="h-px w-8 bg-gray-300" />
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                    <ArrowRightLeft className="h-4 w-4" />
                    2. Choose Skills & Send
                </div>
            </div>

            {/* Step 1: Select User */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search matched users by name or username..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />
                    </div>

                    {loadingMatches ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-32" />
                                            <div className="h-3 bg-gray-200 rounded w-48" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No matched users found</p>
                            <p className="text-gray-400 text-sm mt-1">
                                {userSearch ? 'Try a different search term' : 'Add learn skills to your profile to find matches'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredUsers.map((u) => (
                                <button
                                    key={u.userId}
                                    type="button"
                                    onClick={() => handleSelectUser(u.username)}
                                    className="w-full text-left bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        {u.avatarUrl ? (
                                            <img src={u.avatarUrl} alt={u.username} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                                {(u.username || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900">{u.fullName || u.username}</span>
                                                <span className="text-sm text-gray-400">@{u.username}</span>
                                            </div>
                                            {u.avgRating > 0 && (
                                                <span className="text-xs text-yellow-600">{u.avgRating} ★ ({u.reviewCount} reviews)</span>
                                            )}
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {(u.matchingTeachSkills || []).slice(0, 4).map((s) => (
                                                    <span key={s.skillId} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                                                        {s.skillName}
                                                    </span>
                                                ))}
                                                {(u.matchingTeachSkills || []).length > 4 && (
                                                    <span className="text-xs text-gray-400">+{u.matchingTeachSkills.length - 4} more</span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronLeft className="h-5 w-5 text-gray-300 rotate-180" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: Select Skills & Send */}
            {step === 2 && (
                <div className="space-y-8">
                    {/* Target user header */}
                    {loadingTarget ? (
                        <div className="animate-pulse bg-white rounded-xl border border-gray-100 p-5">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-200 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 bg-gray-200 rounded w-40" />
                                    <div className="h-4 bg-gray-200 rounded w-24" />
                                </div>
                            </div>
                        </div>
                    ) : targetProfile && (
                        <div className="bg-white rounded-xl border border-gray-100 p-5">
                            <div className="flex items-center gap-4">
                                {targetProfile.profile?.avatarUrl ? (
                                    <img src={targetProfile.profile.avatarUrl} alt={targetProfile.username} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                                        {(targetProfile.username || 'U')[0].toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{targetProfile.profile?.fullName || targetProfile.username}</h3>
                                    <p className="text-sm text-gray-500">@{targetProfile.username}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Select skill to learn (required) */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                            <BookOpen className="h-5 w-5 text-green-600" />
                            What do you want to learn? <span className="text-red-500">*</span>
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">Select a skill that {targetProfile?.profile?.fullName || targetProfile?.username || 'this user'} can teach you</p>

                        {targetTeachSkills.length === 0 ? (
                            <div className="bg-gray-50 rounded-xl p-6 text-center">
                                <p className="text-gray-400">This user hasn&apos;t listed any teaching skills yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {targetTeachSkills.map((skill) => (
                                    <div
                                        key={skill.id}
                                        className={`relative border rounded-xl p-4 cursor-pointer transition-all ${
                                            selectedLearnSkillId === skill.id
                                                ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                                : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                                        }`}
                                        onClick={() => setSelectedLearnSkillId(skill.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-gray-900">{skill.skill.name}</span>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[skill.level] || 'bg-gray-100 text-gray-600'}`}>
                                                        {levelLabel[skill.level] || skill.level}
                                                    </span>
                                                    {(skill.preview?.videoUrl || skill.proofUrl) && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setPreviewSkill(skill); }}
                                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                                                        >
                                                            <Play className="h-3 w-3" /> View Demo
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                                selectedLearnSkillId === skill.id ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                            }`}>
                                                {selectedLearnSkillId === skill.id && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Select skill to teach (optional) */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                            <GraduationCap className="h-5 w-5 text-blue-600" />
                            What will you offer in return? <span className="text-xs text-gray-400 font-normal">(optional)</span>
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">Select one of your teaching skills to offer</p>

                        {loadingMySkills ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-16 bg-gray-100 rounded-xl" />
                                <div className="h-16 bg-gray-100 rounded-xl" />
                            </div>
                        ) : myTeachSkills.length === 0 ? (
                            <div className="bg-gray-50 rounded-xl p-6 text-center">
                                <p className="text-gray-400">You haven&apos;t added any teaching skills yet.</p>
                                <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/profile')}>
                                    Add Skills in Profile
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Option to not offer any skill */}
                                <div
                                    className={`border rounded-xl p-4 cursor-pointer transition-all ${
                                        selectedTeachSkillId === null
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                            : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                    onClick={() => setSelectedTeachSkillId(null)}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">No specific skill to offer</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            selectedTeachSkillId === null ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                        }`}>
                                            {selectedTeachSkillId === null && (
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {myTeachSkills.map((skill) => (
                                        <div
                                            key={skill.id}
                                            className={`border rounded-xl p-4 cursor-pointer transition-all ${
                                                selectedTeachSkillId === skill.id
                                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                            }`}
                                            onClick={() => setSelectedTeachSkillId(skill.id)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="font-semibold text-gray-900">{skill.skill.name}</span>
                                                    <div className="mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[skill.level] || 'bg-gray-100 text-gray-600'}`}>
                                                            {levelLabel[skill.level] || skill.level}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                                    selectedTeachSkillId === skill.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                                }`}>
                                                    {selectedTeachSkillId === skill.id && (
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                            <Send className="h-5 w-5 text-purple-600" />
                            Message <span className="text-xs text-gray-400 font-normal">(optional)</span>
                        </h2>
                        <textarea
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 min-h-30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
                            placeholder="Introduce yourself and explain why you'd like to swap skills..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/{MESSAGE_MAX}</p>
                    </div>

                    {/* Summary & Submit */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Request Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">To</span>
                                <span className="font-medium text-gray-900">@{targetUsername}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Want to learn</span>
                                <span className="font-medium text-gray-900">
                                    {selectedLearnSkillId
                                        ? targetTeachSkills.find(s => s.id === selectedLearnSkillId)?.skill?.name || '—'
                                        : <span className="text-red-500 italic">Not selected</span>
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Offering</span>
                                <span className="font-medium text-gray-900">
                                    {selectedTeachSkillId
                                        ? myTeachSkills.find(s => s.id === selectedTeachSkillId)?.skill?.name || '—'
                                        : <span className="text-gray-400 italic">None</span>
                                    }
                                </span>
                            </div>
                            {message.trim() && (
                                <div className="pt-2 border-t border-gray-200">
                                    <span className="text-gray-500">Message</span>
                                    <p className="text-gray-700 mt-1 italic">&ldquo;{message.trim()}&rdquo;</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {pendingRequestForSkill && (
                        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                            <span className="text-yellow-600 text-sm font-medium">⏳ You already have a pending swap request to @{targetUsername} for this skill.</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => navigate('/swaps')}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedLearnSkillId || submitting || !!pendingRequestForSkill}
                            className="gap-2"
                        >
                            {submitting ? (
                                <>
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Sending...
                                </>
                            ) : pendingRequestForSkill ? (
                                <>Already Requested</>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Send Swap Request
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Skill Demo Preview Modal */}
            {previewSkill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewSkill(null)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{previewSkill.skill.name} Demo</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    by @{targetProfile?.username} &middot; {levelLabel[previewSkill.level] || previewSkill.level}
                                </p>
                            </div>
                            <button type="button" onClick={() => setPreviewSkill(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {previewSkill.preview?.videoUrl ? (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Video Demo</p>
                                    <video src={previewSkill.preview.videoUrl} controls className="w-full rounded-lg border border-gray-200" />
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-400">
                                    <Play className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No video demo uploaded</p>
                                </div>
                            )}

                            {previewSkill.proofUrl && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Proof Link</p>
                                    <a
                                        href={previewSkill.proofUrl.startsWith('http') ? previewSkill.proofUrl : `https://${previewSkill.proofUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        {previewSkill.proofUrl}
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                            <Button size="sm" onClick={() => { setSelectedLearnSkillId(previewSkill.id); setPreviewSkill(null); }}>
                                Select This Skill
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewSwapRequest;
