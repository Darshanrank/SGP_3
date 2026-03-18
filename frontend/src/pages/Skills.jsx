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
                className="border border-gray-300 rounded px-3 py-2 w-full"
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
                <div className="section-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <DebounceSearch value={search} onChange={(val) => { setSearch(val); setPage(1); }} />
                    <select
                        value={selectedCategory}
                        onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                        className="border border-gray-300 rounded px-3 py-2 text-sm h-10.5 min-w-45 sm:max-w-60"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            )}
            
            {activeTab === 'explore' && !selectedSkill && (
                <>
                    <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                        {allSkills.map((skill) => (
                            <div key={skill.id} className="section-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewSkill(skill)}>
                                <h3 className="font-semibold text-[17px] text-blue-600">{skill.name}</h3>
                                <p className="text-gray-500 text-sm mt-1">{skill.category}</p>
                                <div className="mt-4 text-xs font-medium text-gray-400">Click to find teachers</div>
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
                        <span className="flex items-center text-sm font-medium">
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
                                <p className="text-gray-500">No teachers found for this skill yet.</p>
                            ) : (
                                skillUsers.filter(u => u.type === 'TEACH' && u.user?.userId !== user?.userId).map(us => (
                                    <div key={us.id} className="bg-white p-5 rounded-xl flex justify-between items-center shadow-sm border border-gray-100">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewUser(us)}
                                                    className="font-semibold text-blue-600 hover:underline cursor-pointer text-left"
                                                >
                                                    {us.user.username}
                                                </button>
                                                {(us.preview?.videoUrl || us.proofUrl) && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                        <Play className="h-3 w-3" /> Demo
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500">Level: {us.level}</div>
                                            {us.preview?.description && <div className="text-sm text-gray-600 truncate mt-1">{us.preview.description}</div>}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <Link to={`/u/${us.user.username}`} className="text-xs text-gray-500 hover:text-blue-600 hover:underline whitespace-nowrap">
                                                View Profile
                                            </Link>
                                            {isAlreadyRequested(us.user.userId, us.id) ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
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
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {previewUser.user.username}&apos;s {selectedSkill?.name} Demo
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">Level: {previewUser.level}</p>
                            </div>
                            <button type="button" onClick={() => setPreviewUser(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {previewUser.preview?.videoUrl ? (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Video Demo</p>
                                    <video
                                        src={previewUser.preview.videoUrl}
                                        controls
                                        className="w-full rounded-lg border border-gray-200"
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-400">
                                    <Play className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No video demo uploaded</p>
                                </div>
                            )}

                            {previewUser.proofUrl && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Proof Link</p>
                                    <a
                                        href={previewUser.proofUrl.startsWith('http') ? previewUser.proofUrl : `https://${previewUser.proofUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        {previewUser.proofUrl}
                                    </a>
                                </div>
                            )}

                            {!previewUser.preview?.videoUrl && !previewUser.proofUrl && (
                                <p className="text-sm text-gray-400 text-center py-4">This user hasn&apos;t uploaded any demo or proof link for this skill yet.</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                            <Link to={`/u/${previewUser.user.username}`} className="text-sm text-blue-600 hover:underline font-medium">
                                View Full Profile
                            </Link>
                            {isAlreadyRequested(previewUser.user.userId, previewUser.id) ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
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
                                <h3 className="font-bold">{us.skill.name}</h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${us.type === 'TEACH' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {us.type}
                                </span>
                                <span className="ml-2 text-sm text-gray-500">{us.level}</span>
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
