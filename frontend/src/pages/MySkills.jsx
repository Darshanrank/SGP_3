import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { addSkill, getAllSkills, getUserSkills, removeSkill, reorderUserSkills, updateUserSkill } from '../services/skill.service';
import { toast } from 'react-hot-toast';
import { useEffect, useMemo, useState } from 'react';
import { getSkillCategories } from '../services/meta.service';
import { GripVertical, BookOpen, GraduationCap, Star } from 'lucide-react';

const MySkills = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [editingSkill, setEditingSkill] = useState(null);
    const [editForm, setEditForm] = useState({ type: 'TEACH', level: 'MEDIUM', category: 'Programming' });
    const [savingEdit, setSavingEdit] = useState(false);
    const [orderedSkills, setOrderedSkills] = useState([]);
    const [draggedSkillId, setDraggedSkillId] = useState(null);
    const [dragOverSkillId, setDragOverSkillId] = useState(null);
    const [persistingOrder, setPersistingOrder] = useState(false);
    const [reorderSupported, setReorderSupported] = useState(true);
    const [addingRecommended, setAddingRecommended] = useState(null);

    const { data: mySkills = [], isLoading, isError } = useQuery({
        queryKey: ['mySkills'],
        queryFn: getUserSkills,
        staleTime: 60000
    });

    const { data: allSkillsPayload } = useQuery({
        queryKey: ['allSkillsForRecommendations'],
        queryFn: () => getAllSkills(1, 200),
        staleTime: 300000
    });

    const { data: categoryData = [] } = useQuery({
        queryKey: ['skillCategories'],
        queryFn: getSkillCategories,
        staleTime: 300000
    });

    useEffect(() => {
        const sorted = [...mySkills].sort((a, b) => {
            const orderA = Number.isFinite(Number(a.displayOrder)) ? Number(a.displayOrder) : Number.MAX_SAFE_INTEGER;
            const orderB = Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;
            return Number(a.id) - Number(b.id);
        });
        setOrderedSkills(sorted);
    }, [mySkills]);

    const handleRemoveSkill = async (skillId) => {
        try {
            await removeSkill(skillId);
            await queryClient.invalidateQueries({ queryKey: ['mySkills'] });
            toast.success('Skill removed');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to remove skill');
        }
    };

    const handleAddRecommendedSkill = async (skill) => {
        if (!skill?.id) return;
        try {
            setAddingRecommended(skill.id);
            await addSkill({
                skillId: skill.id,
                type: 'LEARN',
                level: 'MEDIUM'
            });
            await queryClient.invalidateQueries({ queryKey: ['mySkills'] });
            toast.success(`${skill.name} added to your learning skills`);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to add recommended skill');
        } finally {
            setAddingRecommended(null);
        }
    };

    const categoryOptions = useMemo(() => {
        const fallback = ['Programming', 'Design', 'Business', 'Marketing', 'Languages', 'Music'];
        const source = Array.isArray(categoryData) && categoryData.length ? categoryData : fallback;
        return [...new Set(source.map((item) => String(item).trim()).filter(Boolean))];
    }, [categoryData]);

    const openEditModal = (userSkill) => {
        setEditingSkill(userSkill);
        setEditForm({
            type: normalizeSkillType(userSkill.type),
            level: String(userSkill.level || '').toUpperCase() || 'MEDIUM',
            category: userSkill.skill?.category || categoryOptions[0] || 'Programming'
        });
    };

    const closeEditModal = () => {
        if (savingEdit) return;
        setEditingSkill(null);
    };

    const handleSaveEdit = async () => {
        if (!editingSkill) return;
        try {
            setSavingEdit(true);
            await updateUserSkill(editingSkill.id, {
                type: editForm.type,
                level: editForm.level,
                category: editForm.category
            });
            await queryClient.invalidateQueries({ queryKey: ['mySkills'] });
            toast.success('Skill updated');
            setEditingSkill(null);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update skill');
        } finally {
            setSavingEdit(false);
        }
    };

    const persistSkillOrder = async (nextOrderedSkills) => {
        try {
            setPersistingOrder(true);
            await reorderUserSkills(nextOrderedSkills.map((item) => item.id));
        } catch (error) {
            const message = String(error?.response?.data?.message || 'Failed to save skill order');
            const migrationIssue = message.toLowerCase().includes('latest database migration');

            if (migrationIssue) {
                setReorderSupported(false);
                toast('Drag reorder is temporarily unavailable until migration is applied.');
            } else {
                toast.error(message);
            }

            await queryClient.invalidateQueries({ queryKey: ['mySkills'] });
        } finally {
            setPersistingOrder(false);
        }
    };

    const moveSkillInSection = (sectionType, targetSkillId) => {
        if (!draggedSkillId || draggedSkillId === targetSkillId) return;

        const normalize = (value) => normalizeSkillType(value);
        const typeSkills = orderedSkills.filter((skill) => normalize(skill.type) === sectionType);
        const otherSkills = orderedSkills.filter((skill) => normalize(skill.type) !== sectionType);

        const fromIndex = typeSkills.findIndex((skill) => skill.id === draggedSkillId);
        const toIndex = typeSkills.findIndex((skill) => skill.id === targetSkillId);
        if (fromIndex < 0 || toIndex < 0) return;

        const nextTypeSkills = [...typeSkills];
        const [moved] = nextTypeSkills.splice(fromIndex, 1);
        nextTypeSkills.splice(toIndex, 0, moved);

        const nextOrderedSkills = sectionType === 'TEACH'
            ? [...nextTypeSkills, ...otherSkills]
            : [...otherSkills, ...nextTypeSkills];

        setOrderedSkills(nextOrderedSkills);
        persistSkillOrder(nextOrderedSkills);
    };

    const skillIconMap = {
        java: '☕',
        python: '🐍',
        'c++': '⚙️',
        react: '⚛️',
    };

    const normalizeSkillType = (type) => {
        const value = String(type || '').trim().toUpperCase();
        if (value === 'TEACH' || value === 'TEACHES') return 'TEACH';
        if (value === 'LEARN' || value === 'LEARNS') return 'LEARN';
        return 'LEARN';
    };

    const formatLevel = (level) => {
        const value = String(level || '').toUpperCase();
        if (value === 'LOW') return 'Low';
        if (value === 'MEDIUM') return 'Medium';
        if (value === 'HIGH') return 'High';
        return 'Medium';
    };

    const getLevelColorClass = (level) => {
        const value = String(level || '').toUpperCase();
        if (value === 'LOW') return 'text-gray-400';
        if (value === 'MEDIUM') return 'text-blue-400';
        if (value === 'HIGH') return 'text-green-400';
        return 'text-gray-400';
    };

    const getLevelPercent = (level) => {
        const value = String(level || '').toUpperCase();
        if (value === 'LOW') return 30;
        if (value === 'MEDIUM') return 60;
        if (value === 'HIGH') return 90;
        return 60;
    };

    const getSkillIcon = (skillName) => {
        const key = String(skillName || '').trim().toLowerCase();
        return skillIconMap[key] || '✨';
    };

    const groupedSkills = useMemo(() => {
        const teaching = [];
        const learning = [];

        orderedSkills.forEach((userSkill) => {
            if (normalizeSkillType(userSkill.type) === 'TEACH') {
                teaching.push(userSkill);
            } else {
                learning.push(userSkill);
            }
        });

        return { teaching, learning };
    }, [orderedSkills]);

    const recommendedSkills = useMemo(() => {
        const allSkills = Array.isArray(allSkillsPayload?.data) ? allSkillsPayload.data : [];
        const existingNames = new Set(orderedSkills.map((item) => String(item.skill?.name || '').toLowerCase()));

        return allSkills
            .filter((skill) => !existingNames.has(String(skill.name || '').toLowerCase()))
            .slice(0, 8);
    }, [allSkillsPayload, orderedSkills]);

    const stats = useMemo(() => {
        const teaching = orderedSkills.filter((item) => normalizeSkillType(item.type) === 'TEACH').length;
        const learning = orderedSkills.filter((item) => normalizeSkillType(item.type) === 'LEARN').length;
        return {
            teaching,
            learning,
            total: orderedSkills.length
        };
    }, [orderedSkills]);

    if (isLoading) {
        return <div className="section-card text-center">Loading your skills...</div>;
    }

    if (isError) {
        return <div className="section-card text-center text-red-400">Error loading your skills.</div>;
    }

    const renderSkillGrid = (skills, sectionType) => (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((userSkill) => {
                        const normalizedType = normalizeSkillType(userSkill.type);
                        const isTeach = normalizedType === 'TEACH';
                        const badgeClass = isTeach
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-blue-500/10 text-blue-400';
                        const badgeLabel = isTeach ? 'Teaches' : 'Learns';
                        const levelLabel = formatLevel(userSkill.level);
                        const progressPercent = getLevelPercent(userSkill.level);
                        const levelColorClass = getLevelColorClass(userSkill.level);

                        return (
                            <article
                                key={userSkill.id}
                                draggable={reorderSupported}
                                onDragStart={() => setDraggedSkillId(userSkill.id)}
                                onDragEnd={() => {
                                    setDraggedSkillId(null);
                                    setDragOverSkillId(null);
                                }}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setDragOverSkillId(userSkill.id);
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    moveSkillInSection(sectionType, userSkill.id);
                                    setDragOverSkillId(null);
                                    setDraggedSkillId(null);
                                }}
                                className={`flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900 p-4 transition duration-200 hover:scale-[1.01] hover:border-blue-500/30 hover:shadow-lg ${draggedSkillId === userSkill.id ? 'scale-[1.03] shadow-xl' : ''} ${dragOverSkillId === userSkill.id ? 'border-blue-500/60' : ''}`}
                            >
                                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                                    <GripVertical className={`h-4 w-4 ${reorderSupported ? 'cursor-grab text-gray-500 active:cursor-grabbing' : 'cursor-not-allowed text-gray-600'}`} />
                                    <span className="text-xl" aria-hidden="true">{getSkillIcon(userSkill.skill?.name)}</span>
                                    <h3 className="truncate">{userSkill.skill?.name || 'Untitled Skill'}</h3>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`rounded-md px-2 py-1 text-xs ${badgeClass}`}>{badgeLabel}</span>
                                    <span className={`text-sm ${levelColorClass}`}>• {levelLabel}</span>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400">Skill Progress</p>
                                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
                                        <div
                                            className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-400 transition-all duration-300"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400">Level: {levelLabel}</p>
                                </div>

                                <div className="mt-3 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(userSkill)}
                                        className="rounded-md bg-blue-500/10 px-3 py-1 text-sm text-blue-400 transition hover:bg-blue-500/20"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSkill(userSkill.id)}
                                        className="rounded-md bg-red-500/10 px-3 py-1 text-sm text-red-400 transition hover:bg-red-500/20"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </article>
                        );
                    })}
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl space-y-10 px-6 py-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="page-title">My Skills</h1>
                    <p className="text-sm text-[#8DA0BF]">Manage skills you teach and skills you want to learn.</p>
                </div>
                <Button onClick={() => navigate('/skills/new')}>+ Add Skill</Button>
            </header>

            <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <article className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-900 p-5 text-center">
                    <BookOpen className="mb-2 h-5 w-5 text-blue-300" />
                    <p className="text-sm text-gray-400">Skills Teaching</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.teaching}</p>
                </article>
                <article className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-900 p-5 text-center">
                    <GraduationCap className="mb-2 h-5 w-5 text-blue-300" />
                    <p className="text-sm text-gray-400">Skills Learning</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.learning}</p>
                </article>
                <article className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-900 p-5 text-center">
                    <Star className="mb-2 h-5 w-5 text-blue-300" />
                    <p className="text-sm text-gray-400">Total Skills</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.total}</p>
                </article>
            </section>

            {persistingOrder && (
                <p className="text-sm text-gray-400">Saving skill order...</p>
            )}

            {!reorderSupported && (
                <p className="text-sm text-amber-300">Drag reorder is disabled until the latest database migration is applied.</p>
            )}

            {orderedSkills.length === 0 ? (
                <section className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                    <p className="text-lg font-semibold text-white">You haven&apos;t added any skills yet.</p>
                    <p className="text-sm text-gray-400">Start by adding a skill you can teach or want to learn.</p>
                    <button
                        type="button"
                        onClick={() => navigate('/skills/new')}
                        className="rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-500"
                    >
                        Add Your First Skill
                    </button>
                </section>
            ) : (
                <div className="space-y-8">
                    <section className="mt-12">
                        <h2 className="mb-4 text-lg font-semibold text-white">Skills I Teach</h2>
                        {groupedSkills.teaching.length ? renderSkillGrid(groupedSkills.teaching, 'TEACH') : (
                            <article className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-slate-900 py-16 text-center">
                                <p className="text-lg font-semibold text-white">No skills added yet.</p>
                                <p className="text-sm text-gray-400">Start by adding a skill you can teach or want to learn.</p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/skills/new')}
                                    className="rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-500"
                                >
                                    Add Skill
                                </button>
                            </article>
                        )}
                    </section>
                    <section className="mt-12">
                        <h2 className="mb-4 text-lg font-semibold text-white">Skills I Want to Learn</h2>
                        {groupedSkills.learning.length ? renderSkillGrid(groupedSkills.learning, 'LEARN') : (
                            <article className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-slate-900 py-16 text-center">
                                <p className="text-lg font-semibold text-white">No skills added yet.</p>
                                <p className="text-sm text-gray-400">Start by adding a skill you can teach or want to learn.</p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/skills/new')}
                                    className="rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-500"
                                >
                                    Add Skill
                                </button>
                            </article>
                        )}
                    </section>
                </div>
            )}

            <section className="mt-12 space-y-4">
                <h2 className="text-lg font-semibold text-white">Recommended Skills</h2>
                {recommendedSkills.length === 0 ? (
                    <article className="rounded-xl border border-white/10 bg-slate-900 p-4 text-sm text-gray-400">
                        You&apos;re all caught up. More recommendations will appear as new skills are added.
                    </article>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {recommendedSkills.map((skill) => (
                            <article
                                key={skill.id}
                                className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-4 py-3 transition hover:border-blue-500/40"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="text-base" aria-hidden="true">{getSkillIcon(skill.name)}</span>
                                    <p className="truncate pr-2 text-sm text-white">{skill.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleAddRecommendedSkill(skill)}
                                    disabled={addingRecommended === skill.id}
                                    className="rounded-md bg-blue-500/10 px-3 py-1 text-xs text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-60"
                                >
                                    {addingRecommended === skill.id ? 'Adding...' : 'Add'}
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {editingSkill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6">
                        <h3 className="text-lg font-semibold text-white">Edit Skill</h3>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Skill Name</label>
                                <input
                                    value={editingSkill.skill?.name || ''}
                                    readOnly
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-gray-200"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Skill Type</label>
                                <select
                                    value={editForm.type}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-gray-200"
                                >
                                    <option value="TEACH">Teaches</option>
                                    <option value="LEARN">Learns</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Skill Level</label>
                                <select
                                    value={editForm.level}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, level: e.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-gray-200"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Category</label>
                                <select
                                    value={editForm.category}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-gray-200"
                                >
                                    {categoryOptions.map((category) => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeEditModal}
                                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-gray-300 transition hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="rounded-md bg-blue-500/20 px-3 py-1.5 text-sm text-blue-300 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {savingEdit ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MySkills;
