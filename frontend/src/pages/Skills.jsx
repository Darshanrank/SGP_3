// src/pages/Skills.jsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllSkills, getUserSkills, getUsersWithSkill, removeSkill } from '../services/skill.service';
import { Button } from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { createSwapRequest } from '../services/swap.service';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Skills = () => {
    // State
    const [activeTab, setActiveTab] = useState('explore');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    
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
        queryKey: ['skills', page, search],
        queryFn: () => getAllSkills(page, 20, search),
        keepPreviousData: true,
        staleTime: 60000, // 1 minute
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


    if (activeTab === 'explore' && loadingAll && page === 1) return <div className="p-8 text-center">Loading skills...</div>;
    if (activeTab === 'my' && loadingMy) return <div className="p-8 text-center">Loading your skills...</div>;
    if (errorAll) return <div className="p-8 text-center text-red-500">Error loading skills</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Skills</h1>
                
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

            {/* Search Bar for Explore */}
            {activeTab === 'explore' && !selectedSkill && (
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        placeholder="Search skills..." 
                        className="border border-gray-300 rounded px-3 py-2 w-full max-w-sm"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
            )}
            
            {activeTab === 'explore' && !selectedSkill && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allSkills.map((skill) => (
                            <div key={skill.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewSkill(skill)}>
                                <h3 className="font-semibold text-lg text-blue-600">{skill.name}</h3>
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
                <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" onClick={() => setSelectedSkill(null)}>&larr; Back</Button>
                        <h2 className="text-xl font-bold">Users for {selectedSkill.name}</h2>
                    </div>

                    {loadingUsers ? <p>Loading users...</p> : (
                        <div className="grid grid-cols-1 gap-4">
                            {skillUsers.filter(u => u.type === 'TEACH' && u.user?.userId !== user?.userId).length === 0 ? (
                                <p className="text-gray-500">No teachers found for this skill yet.</p>
                            ) : (
                                skillUsers.filter(u => u.type === 'TEACH' && u.user?.userId !== user?.userId).map(us => (
                                    <div key={us.id} className="bg-white p-4 rounded-lg flex justify-between items-center shadow-sm border border-gray-100">
                                        <div>
                                            <Link to={`/users/${us.user.userId}`} className="font-semibold text-blue-600 hover:underline">{us.user.username}</Link>
                                            <div className="text-sm text-gray-500">Level: {us.level}</div>
                                            {us.preview && <div className="text-sm text-gray-600 truncate mt-1">{us.preview.description}</div>}
                                        </div>
                                        <Button size="sm" onClick={() => requestSwap(us.user.userId, us.id)}>Request Swap</Button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'my' && (
                <div className="grid grid-cols-1 gap-4">
                    {/* mySkills is likely just an array from backend, not paginated object, adjust if needed */}
                    {(!mySkills || mySkills.length === 0) ? <p>You haven't added any skills yet.</p> : mySkills.map(us => (
                        <div key={us.id} className="bg-white p-4 rounded-lg border border-gray-100 flex justify-between items-center">
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
