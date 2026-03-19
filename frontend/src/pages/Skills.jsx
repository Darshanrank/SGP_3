// src/pages/Skills.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllSkills, getUserSkills, getUsersWithSkill, removeSkill } from '../services/skill.service';
import { getSkillCategories } from '../services/meta.service';
import { Button } from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { createSwapRequest, getMyRequests } from '../services/swap.service';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { X, ExternalLink, Play, Clock } from 'lucide-react';

// Debounced search input component
const DebounceSearch = ({ value, onChange, delay = 400 }) => {
    const [localValue, setLocalValue] = useState(value);
    const timerRef = useRef(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e) => {
        const val = e.target.value;
        setLocalValue(val);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onChange(val), delay);
    };

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <div className="flex w-full">
            <input 
                type="text" 
                placeholder="Search skills..." 
                className="h-11 w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2 text-[#DCE7F5] placeholder:text-[#6F83A3]"
                value={localValue}
                onChange={handleChange}
            />
        </div>
    );
};

const Skills = () => {
    // State
    const [activeTab, setActiveTab] = useState('explore');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [previewUser, setPreviewUser] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    
    // Auth
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Queries
    const { 
        data: allSkillsData, 
        isLoading: loadingAll, 
        error: errorAll 
    } = useQuery({
        queryKey: ['skills', page, search, selectedCategory],
        queryFn: () => getAllSkills(page, 20, search, selectedCategory),
        keepPreviousData: true,
        staleTime: 60000, // 1 minute
    });

    // Fetch skill categories
    const { data: categories = [] } = useQuery({
        queryKey: ['skillCategories'],
        queryFn: getSkillCategories,
        staleTime: 300000, // 5 minutes
    });

    const { 
        data: mySkills, 
        isLoading: loadingMy 
    } = useQuery({
        queryKey: ['mySkills'],
        queryFn: getUserSkills,
        enabled: activeTab === 'my',
        staleTime: 60000,
    });

    const {
        data: skillUsersData,
        isLoading: loadingUsers
    } = useQuery({
        queryKey: ['skillUsers', selectedSkill?.id],
        queryFn: () => getUsersWithSkill(selectedSkill.id),
        enabled: !!selectedSkill,
    });

    // Fetch sent requests to check if already requested
    const { data: sentRequestsData } = useQuery({
        queryKey: ['swaps', 'sent'],
        queryFn: async () => {
            const res = await getMyRequests('sent', 1, 100);
            return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        },
        staleTime: 30000,
    });

    const pendingSentRequests = (Array.isArray(sentRequestsData) ? sentRequestsData : []).filter(r => r.status === 'PENDING');

    const isAlreadyRequested = (userId, userSkillId) => {
        return pendingSentRequests.some(r => r.toUserId === userId && r.learnSkillId === userSkillId);
    };

    // Handlers
    const handleViewSkill = (skill) => {
        setSelectedSkill(skill);
    };

    const requestSwap = async (receiverId, learnSkillId) => {
        const message = prompt("Enter a message for your swap request:");
        if (!message) return;

        try {
            await createSwapRequest({
                toUserId: receiverId,
                learnSkillId: parseInt(learnSkillId, 10),
                message
            });
            toast.success("Request sent!");
        } catch (error) {
            toast.error("Failed to send request");
        }
    };

    const handleRemoveSkill = async (skillId) => {
        try {
            await removeSkill(skillId);
            await queryClient.invalidateQueries({ queryKey: ['mySkills'] });
            toast.success('Skill removed');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove skill');
        }
    };

    // Derived State
    const allSkills = allSkillsData?.data || [];
    const meta = allSkillsData?.meta || {};
    const skillUsers = skillUsersData?.data || [];
    const filteredSkills = selectedLevel
        ? allSkills.filter((skill) => !skill.level || skill.level === selectedLevel)
        : allSkills;


    if (activeTab === 'explore' && loadingAll && page === 1) return <div className="section-card text-center">Loading skills...</div>;
    if (activeTab === 'my' && loadingMy) return <div className="section-card text-center">Loading your skills...</div>;
    if (errorAll) return <div className="section-card text-center text-red-500">Error loading skills</div>;

    return (
        <div className="page-shell">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="page-title">Skills</h1>
                
                <div className="flex space-x-2">
                    <Button
                        variant={activeTab === 'explore' ? 'primary' : 'ghost'}
                        onClick={() => { setActiveTab('explore'); setSelectedSkill(null); }}
                    >
                        Explore
                    </Button>
                    <Button
                        variant={activeTab === 'my' ? 'primary' : 'ghost'}
                        onClick={() => { setActiveTab('my'); setSelectedSkill(null); }}
                    >
                        My Skills
                    </Button>
                </div>
                {activeTab === 'my' && (
                    <Button onClick={() => navigate('/skills/new')}>+ Add Skill</Button>
                )}
            </div>

            {/* Search Bar & Category Filter for Explore (debounced) */}
            {activeTab === 'explore' && !selectedSkill && (
                <div className="section-card flex flex-col gap-3 md:flex-row md:items-center">
                    <DebounceSearch value={search} onChange={(val) => { setSearch(val); setPage(1); }} />
                    <select
                        value={selectedCategory}
                        onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                        className="h-11 min-w-45 rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="h-11 min-w-40 rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                    >
                        <option value="">All Levels</option>
                        <option value="LOW">Beginner</option>
                        <option value="MEDIUM">Intermediate</option>
                        <option value="HIGH">Advanced</option>
                    </select>
                </div>
            )}
            
            {activeTab === 'explore' && !selectedSkill && (
                <>
                    <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                        {filteredSkills.map((skill) => (
                            <div key={skill.id} className="section-card cursor-pointer" onClick={() => handleViewSkill(skill)}>
                                <h3 className="text-[17px] font-semibold text-[#DCE7F5]">{skill.name}</h3>
                                <p className="mt-1 text-sm text-[#8DA0BF]">{skill.category}</p>
                                <div className="mt-4 text-xs font-medium text-[#6F83A3]">Click to find teachers</div>
                            </div>
                        ))}
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-center mt-6 gap-2">
                        <Button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            variant="ghost"
                        >
                            Previous
                        </Button>
                        <span className="flex items-center text-sm font-medium text-[#8DA0BF]">
                            Page {page} {meta.totalPages ? `of ${meta.totalPages}` : ''}
                        </span>
                        <Button 
                            disabled={meta.totalPages && page >= meta.totalPages} 
                            onClick={() => setPage(p => p + 1)}
                            variant="ghost"
                        >
                            Next
                        </Button>
                    </div>
                </>
            )}

            {selectedSkill && (
                <div className="section-card space-y-6">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" onClick={() => setSelectedSkill(null)}>&larr; Back</Button>
                        <h2 className="section-title">Users for {selectedSkill.name}</h2>
                    </div>

                    {loadingUsers ? <p>Loading users...</p> : (
                        <div className="grid grid-cols-1 gap-4">
                            {skillUsers.filter(u => u.type === 'TEACH' && u.user?.userId !== user?.userId).length === 0 ? (
                                <p className="text-[#8DA0BF]">No teachers found for this skill yet.</p>
                            ) : (
                                skillUsers.filter(u => u.type === 'TEACH' && u.user?.userId !== user?.userId).map(us => (
                                    <div key={us.id} className="rounded-2xl border border-white/10 bg-[#0E1620] p-5 flex justify-between items-center transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/u/${us.user.username}`}
                                                    className="cursor-pointer text-left font-semibold text-[#DCE7F5] hover:text-[#0A4D9F]"
                                                >
                                                    {us.user.username}
                                                </Link>
                                                {(us.preview?.videoUrl || us.proofUrl) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewUser(us)}
                                                        className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/20 px-2 py-0.5 text-xs text-[#22C55E] transition hover:bg-[#22C55E]/30"
                                                        aria-label={`Open ${us.user.username} demo`}
                                                    >
                                                        <Play className="h-3 w-3" /> Demo
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-sm text-[#8DA0BF]">Level: {us.level}</div>
                                            {us.preview?.description && <div className="mt-1 truncate text-sm text-[#8DA0BF]">{us.preview.description}</div>}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <Link to={`/u/${us.user.username}`} className="whitespace-nowrap text-xs text-[#8DA0BF] hover:text-[#0A4D9F] hover:underline">
                                                View Profile
                                            </Link>
                                            {isAlreadyRequested(us.user.userId, us.id) ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/20 px-3 py-1.5 text-xs font-semibold text-[#F59E0B]">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    Requested
                                                </span>
                                            ) : (
                                                <Button size="sm" onClick={() => navigate(`/swaps/new?to=${us.user.username}&skillId=${us.id}`)}>Request Swap</Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Skill Demo Preview Modal */}
            {previewUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewUser(null)}>
                    <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111721] shadow-[0_16px_40px_rgba(0,0,0,0.55)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-white/10 p-5">
                            <div>
                                <h3 className="text-lg font-bold text-[#DCE7F5]">
                                    {previewUser.user.username}&apos;s {selectedSkill?.name} Demo
                                </h3>
                                <p className="mt-0.5 text-sm text-[#8DA0BF]">Level: {previewUser.level}</p>
                            </div>
                            <button type="button" onClick={() => setPreviewUser(null)} className="rounded-lg p-1 text-[#8DA0BF] transition-colors hover:bg-[#151D27] hover:text-[#DCE7F5]">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {previewUser.preview?.videoUrl ? (
                                <div>
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Video Demo</p>
                                    <video
                                        src={previewUser.preview.videoUrl}
                                        controls
                                        className="w-full rounded-lg border border-white/10"
                                    />
                                </div>
                            ) : (
                                <div className="py-6 text-center text-[#8DA0BF]">
                                    <Play className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No video demo uploaded</p>
                                </div>
                            )}

                            {previewUser.proofUrl && (
                                <div>
                                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Proof Link</p>
                                    <a
                                        href={previewUser.proofUrl.startsWith('http') ? previewUser.proofUrl : `https://${previewUser.proofUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7BB2FF] hover:text-[#9fc8ff] hover:underline"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        {previewUser.proofUrl}
                                    </a>
                                </div>
                            )}

                            {!previewUser.preview?.videoUrl && !previewUser.proofUrl && (
                                <p className="py-4 text-center text-sm text-[#8DA0BF]">This user hasn&apos;t uploaded any demo or proof link for this skill yet.</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between rounded-b-2xl border-t border-white/10 bg-[#0E1620] p-5">
                            <Link to={`/u/${previewUser.user.username}`} className="text-sm font-medium text-[#7BB2FF] hover:underline">
                                View Full Profile
                            </Link>
                            {isAlreadyRequested(previewUser.user.userId, previewUser.id) ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/20 px-3 py-1.5 text-xs font-semibold text-[#F59E0B]">
                                    <Clock className="h-3.5 w-3.5" />
                                    Already Requested
                                </span>
                            ) : (
                                <Button size="sm" onClick={() => { setPreviewUser(null); navigate(`/swaps/new?to=${previewUser.user.username}&skillId=${previewUser.id}`); }}>
                                    Request Swap
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'my' && (
                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                    {/* mySkills is likely just an array from backend, not paginated object, adjust if needed */}
                    {(!mySkills || mySkills.length === 0) ? <p>You haven't added any skills yet.</p> : mySkills.map(us => (
                        <div key={us.id} className="section-card flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-[#DCE7F5]">{us.skill.name}</h3>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${us.type === 'TEACH' ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#0A4D9F]/20 text-[#7BB2FF]'}`}>
                                    {us.type}
                                </span>
                                <span className="ml-2 text-sm text-[#8DA0BF]">{us.level}</span>
                            </div>
                            <Button variant="danger" size="sm" onClick={() => handleRemoveSkill(us.id)}>Remove</Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Skills;
