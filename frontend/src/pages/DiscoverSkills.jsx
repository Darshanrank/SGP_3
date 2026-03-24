import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, BookmarkPlus, RotateCcw, Trash2, Star, CalendarDays } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    discoverUsers,
    getSavedDiscoveryFilters,
    createSavedDiscoveryFilter,
    deleteSavedDiscoveryFilter
} from '../services/matching.service';
import { getAllSkills } from '../services/skill.service';
import { getSkillCategories } from '../services/meta.service';
import { Button } from '../components/ui/Button';

const DAY_OPTIONS = [
    { key: 'MONDAY', label: 'Mon' },
    { key: 'TUESDAY', label: 'Tue' },
    { key: 'WEDNESDAY', label: 'Wed' },
    { key: 'THURSDAY', label: 'Thu' },
    { key: 'FRIDAY', label: 'Fri' },
    { key: 'SATURDAY', label: 'Sat' },
    { key: 'SUNDAY', label: 'Sun' }
];

const DAY_LABEL_MAP = DAY_OPTIONS.reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
}, {});

const SKILL_LEVEL_OPTIONS = [
    { value: '', label: 'Any level' },
    { value: 'LOW', label: 'Beginner' },
    { value: 'MEDIUM', label: 'Intermediate' },
    { value: 'HIGH', label: 'Advanced' }
];

const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Spanish', 'Other'];

const RATING_OPTIONS = [
    { value: '', label: 'Any rating' },
    { value: '4', label: '4+ stars' },
    { value: '3', label: '3+ stars' }
];

const SORT_OPTIONS = [
    { value: 'best-match', label: 'Best match' },
    { value: 'highest-rated', label: 'Highest rated' },
    { value: 'most-swaps', label: 'Most swaps' },
    { value: 'newest', label: 'Newest' }
];

const FALLBACK_CATEGORIES = ['Programming', 'Design', 'Marketing', 'Languages', 'Music', 'Business'];

const CATEGORY_ICONS = {
    'Programming': '💻',
    'Design': '🎨',
    'Languages': '🌐',
    'Marketing': '📊',
    'Music': '🎵',
    'Business': '💼'
};

const INITIAL_FILTERS = {
    skill: '',
    category: '',
    level: '',
    language: '',
    rating: '',
    availableDays: [],
    sort: 'best-match'
};

const DiscoverSkillsPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
    const [page, setPage] = useState(1);
    const [saveFilterName, setSaveFilterName] = useState('');
    const [savingFilter, setSavingFilter] = useState(false);

    const { data: discoverPayload, isLoading } = useQuery({
        queryKey: ['discover-users', appliedFilters, page],
        queryFn: () => discoverUsers({
            ...appliedFilters,
            page,
            limit: 12
        }),
        keepPreviousData: true
    });

    const { data: savedFilters = [], isLoading: loadingSavedFilters } = useQuery({
        queryKey: ['discover-saved-filters'],
        queryFn: getSavedDiscoveryFilters,
        staleTime: 30000
    });

    const { data: allSkillsData } = useQuery({
        queryKey: ['discover-skill-list'],
        queryFn: () => getAllSkills(1, 200),
        staleTime: 300000
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['discover-skill-categories'],
        queryFn: getSkillCategories,
        staleTime: 300000
    });

    const users = discoverPayload?.data || [];
    const meta = discoverPayload?.meta || { page: 1, totalPages: 1, total: 0 };
    const allSkills = allSkillsData?.data || [];
    const displayCategories = categories.length ? categories : FALLBACK_CATEGORIES;

    const { popularSkillsByCategory, trendingSkills } = useMemo(() => {
        const grouped = {};
        const skillCounts = {};
        
        displayCategories.forEach((category) => {
            grouped[category] = [];
        });

        allSkills.forEach((skill) => {
            const category = skill?.category || 'Other';
            if (!grouped[category]) grouped[category] = [];
            if (grouped[category].length >= 8) return;
            grouped[category].push(skill.name);
            
            // Track skill counts for trending
            skillCounts[skill.name] = (skillCounts[skill.name] || 0) + 1;
        });

        // Get trending skills (top 6 most common)
        const trending = Object.entries(skillCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([skill]) => skill);

        return { popularSkillsByCategory: grouped, trendingSkills: trending };
    }, [allSkills, displayCategories]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.skill.trim()) count += 1;
        if (filters.category.trim()) count += 1;
        if (filters.level) count += 1;
        if (filters.language) count += 1;
        if (filters.rating) count += 1;
        if (filters.availableDays.length > 0) count += 1;
        return count;
    }, [filters]);

    useEffect(() => {
        const nextSkill = String(searchParams.get('skill') || '').trim();
        const nextCategory = String(searchParams.get('category') || '').trim();

        if (!nextSkill && !nextCategory) return;

        const nextFilters = {
            ...INITIAL_FILTERS,
            skill: nextSkill,
            category: nextCategory
        };

        setFilters((prev) => (prev.skill === nextSkill && prev.category === nextCategory ? prev : nextFilters));
        setAppliedFilters((prev) => (prev.skill === nextSkill && prev.category === nextCategory ? prev : nextFilters));
        setPage(1);
    }, [searchParams]);

    const handleToggleDay = (dayKey) => {
        setFilters((prev) => {
            const hasDay = prev.availableDays.includes(dayKey);
            return {
                ...prev,
                availableDays: hasDay
                    ? prev.availableDays.filter((day) => day !== dayKey)
                    : [...prev.availableDays, dayKey]
            };
        });
    };

    const handleApplyFilters = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const handleResetFilters = () => {
        setFilters(INITIAL_FILTERS);
        setAppliedFilters(INITIAL_FILTERS);
        setPage(1);
    };

    const handleSkillTagClick = (skillName) => {
        const nextFilters = { ...filters, skill: skillName };
        setFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const handleSaveCurrentFilter = async () => {
        const name = saveFilterName.trim();
        if (!name) {
            toast.error('Please enter a name for this filter');
            return;
        }

        try {
            setSavingFilter(true);
            await createSavedDiscoveryFilter({
                name,
                filters: {
                    ...appliedFilters,
                    rating: appliedFilters.rating || null
                }
            });
            setSaveFilterName('');
            toast.success('Filter saved');
            await queryClient.invalidateQueries({ queryKey: ['discover-saved-filters'] });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to save filter');
        } finally {
            setSavingFilter(false);
        }
    };

    const handleLoadSavedFilter = (saved) => {
        const payload = saved?.filters && typeof saved.filters === 'object' ? saved.filters : {};
        const merged = {
            ...INITIAL_FILTERS,
            ...payload,
            availableDays: Array.isArray(payload?.availableDays)
                ? payload.availableDays
                : Array.isArray(payload?.days)
                    ? payload.days
                    : []
        };

        setFilters(merged);
        setAppliedFilters(merged);
        setPage(1);
    };

    const handleDeleteSavedFilter = async (id) => {
        try {
            await deleteSavedDiscoveryFilter(id);
            toast.success('Saved filter removed');
            await queryClient.invalidateQueries({ queryKey: ['discover-saved-filters'] });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to delete saved filter');
        }
    };

    return (
        <div className="page-shell">
            <header className="space-y-2">
                <h1 className="page-title">Discover Skills</h1>
                <p className="text-sm text-[#8DA0BF]">
                    Browse skills, search teachers, and discover potential swap partners in one place.
                </p>
            </header>

            <section className="rounded-xl border border-white/5 bg-[#111721] p-6">
                <h2 className="mb-4 text-lg font-semibold text-[#DCE7F5]">Search + Filters</h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Skill search</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F83A3]" />
                            <input
                                type="text"
                                value={filters.skill}
                                onChange={(e) => setFilters((prev) => ({ ...prev, skill: e.target.value }))}
                                placeholder="Python, React, SQL..."
                                className="w-full rounded-lg border border-white/5 bg-[#0A0F14] py-2 pl-9 pr-3 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Skill level</label>
                        <select
                            value={filters.level}
                            onChange={(e) => setFilters((prev) => ({ ...prev, level: e.target.value }))}
                            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm"
                        >
                            {SKILL_LEVEL_OPTIONS.map((option) => (
                                <option key={option.value || 'any'} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Language</label>
                        <select
                            value={filters.language}
                            onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
                            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm"
                        >
                            <option value="">Any language</option>
                            {LANGUAGE_OPTIONS.map((language) => (
                                <option key={language} value={language}>{language}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Rating</label>
                        <select
                            value={filters.rating}
                            onChange={(e) => setFilters((prev) => ({ ...prev, rating: e.target.value }))}
                            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm"
                        >
                            {RATING_OPTIONS.map((option) => (
                                <option key={option.label} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Sort</label>
                        <select
                            value={filters.sort}
                            onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
                            className="w-full rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">
                        <CalendarDays className="h-4 w-4" />
                        Available this week
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                        {DAY_OPTIONS.map((day) => {
                            const selected = filters.availableDays.includes(day.key);
                            return (
                                <button
                                    type="button"
                                    key={day.key}
                                    onClick={() => handleToggleDay(day.key)}
                                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                                        selected
                                            ? 'border-[#0A4D9F] bg-[#0A4D9F]/20 text-[#DCE7F5]'
                                            : 'border-white/10 bg-[#0A0F14] text-[#8DA0BF] hover:border-white/20'
                                    }`}
                                >
                                    {day.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Button onClick={handleApplyFilters}>Apply Filters</Button>
                    <Button variant="ghost" onClick={handleResetFilters} className="inline-flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" /> Reset Filters
                    </Button>
                    <span className="text-xs text-[#8DA0BF]">Active filters: {activeFilterCount}</span>
                </div>
            </section>

            <section className="mt-10">
                {/* Trending Skills Section */}
                {trendingSkills.length > 0 && (
                    <div className="mb-8">
                        <div className="mb-4 flex items-center gap-2">
                            <span className="text-2xl">🔥</span>
                            <h2 className="text-lg font-semibold text-[#DCE7F5]">Trending Skills</h2>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {trendingSkills.map((skill) => (
                                <button
                                    key={skill}
                                    type="button"
                                    onClick={() => handleSkillTagClick(skill)}
                                    className="rounded-full bg-[#0A4D9F] px-5 py-2.5 text-sm font-medium text-[#DCE7F5] transition hover:bg-[#0A7FFF] hover:shadow-lg hover:shadow-[#0A4D9F]/20"
                                >
                                    {skill}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Cards Section */}
                <div>
                    <h2 className="mb-6 text-lg font-semibold text-[#DCE7F5]">Browse by Category</h2>
                    <div className="grid gap-4 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {displayCategories.map((category) => (
                            <article
                                key={category}
                                className="group rounded-xl border border-white/5 bg-[#111721] p-5 transition duration-300 hover:border-[#0A4D9F]/50 hover:bg-[#151D27] hover:shadow-lg hover:shadow-[#0A4D9F]/10"
                            >
                                {/* Header: Icon + Category Name */}
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="text-2xl">{CATEGORY_ICONS[category] || '⭐'}</span>
                                    <h3 className="text-base font-semibold text-[#DCE7F5]">{category}</h3>
                                </div>

                                {/* Skills List */}
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {(popularSkillsByCategory[category] || []).slice(0, 6).map((skillName) => (
                                        <button
                                            key={`${category}-${skillName}`}
                                            type="button"
                                            onClick={() => handleSkillTagClick(skillName)}
                                            className="rounded-full border border-white/10 bg-[#0F1623] px-3 py-1 text-xs text-[#8DA0BF] transition hover:border-[#0A4D9F] hover:bg-[#0A4D9F]/20 hover:text-[#DCE7F5]"
                                        >
                                            {skillName}
                                        </button>
                                    ))}
                                </div>

                                {/* View All Link */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            level: '',
                                            language: ''
                                        }));
                                        setPage(1);
                                    }}
                                    className="text-xs font-medium text-[#0A4D9F] transition hover:text-[#0A7FFF] group-hover:underline"
                                >
                                    View All Skills →
                                </button>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-white/5 bg-[#111721] p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#DCE7F5]">Teacher Results</h2>
                    <span className="text-sm text-[#8DA0BF]">{meta.total || 0} users found</span>
                </div>

                {isLoading ? (
                    <div className="section-card text-center text-[#8DA0BF]">Searching users...</div>
                ) : users.length === 0 ? (
                    <div className="section-card text-center">
                        <p className="text-[#DCE7F5]">No matching users found.</p>
                        <p className="mt-1 text-sm text-[#8DA0BF]">Try fewer filters or click a popular skill.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {users.map((user) => (
                            <article
                                key={user.userId}
                                className="rounded-xl border border-white/5 bg-[#111721] p-5 shadow-md transition hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.username} loading="lazy" className="h-11 w-11 rounded-full object-cover" />
                                        ) : (
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0A4D9F]/30 text-sm font-bold text-[#DCE7F5]">
                                                {(user.username || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[#DCE7F5]">{user.fullName || user.username}</p>
                                            <p className="truncate text-xs text-[#8DA0BF]">@{user.username}</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="inline-flex items-center gap-1 text-xs text-[#FCD34D]">
                                            <Star className="h-3.5 w-3.5 fill-current" />
                                            {user.avgRating > 0 ? user.avgRating.toFixed(1) : 'New'}
                                        </p>
                                        <p className="text-[11px] text-[#6F83A3]">({user.reviewCount || 0} reviews)</p>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div>
                                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Teaches</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(user.teaches || []).slice(0, 4).map((skill) => (
                                                <span key={skill.userSkillId} className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                                                    {skill.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Wants to Learn</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(user.learns || []).slice(0, 4).map((skill) => (
                                                <span key={skill.userSkillId} className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                                                    {skill.name}
                                                </span>
                                            ))}
                                            {(!user.learns || user.learns.length === 0) && (
                                                <span className="text-xs text-[#6F83A3]">No learning goals listed</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Availability</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(user.availability || []).length > 0 ? user.availability.map((day) => (
                                                <span key={`${user.userId}_${day}`} className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-[#8DA0BF]">
                                                    {DAY_LABEL_MAP[day] || day.slice(0, 3)}
                                                </span>
                                            )) : (
                                                <span className="text-xs text-[#6F83A3]">Not set</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <Link to={`/u/${user.username}`} className="flex-1">
                                        <Button size="sm" variant="secondary" className="w-full">View Profile</Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const params = user.primaryTeachSkillId
                                                ? `?to=${encodeURIComponent(user.username)}&skillId=${encodeURIComponent(user.primaryTeachSkillId)}`
                                                : `?to=${encodeURIComponent(user.username)}`;
                                            navigate(`/swaps/new${params}`);
                                        }}
                                        className="flex-1"
                                    >
                                        Request Swap
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <div className="mt-6 flex items-center justify-center gap-3">
                    <Button
                        variant="ghost"
                        disabled={page <= 1}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-[#8DA0BF]">
                        Page {meta.page || page} of {meta.totalPages || 1}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={(meta.page || page) >= (meta.totalPages || 1)}
                        onClick={() => setPage((prev) => prev + 1)}
                    >
                        Next
                    </Button>
                </div>
            </section>

            <section className="rounded-xl border border-white/5 bg-[#111721] p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-[#DCE7F5]">Saved Filters</h2>
                        <p className="text-xs text-[#8DA0BF]">Save and reuse your discovery combinations.</p>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <input
                            type="text"
                            value={saveFilterName}
                            onChange={(e) => setSaveFilterName(e.target.value)}
                            placeholder="Python Experts"
                            className="rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm"
                        />
                        <Button onClick={handleSaveCurrentFilter} disabled={savingFilter} className="inline-flex items-center gap-2">
                            <BookmarkPlus className="h-4 w-4" />
                            {savingFilter ? 'Saving...' : 'Save Filter'}
                        </Button>
                    </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {loadingSavedFilters && <p className="text-sm text-[#8DA0BF]">Loading saved filters...</p>}
                    {!loadingSavedFilters && savedFilters.length === 0 && (
                        <p className="text-sm text-[#8DA0BF]">No saved filters yet.</p>
                    )}
                    {savedFilters.map((item) => (
                        <div key={item.id} className="rounded-lg border border-white/10 bg-[#0E1620] p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-[#DCE7F5]">{item.name}</p>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteSavedFilter(item.id)}
                                    className="rounded p-1 text-[#8DA0BF] hover:bg-[#151D27] hover:text-[#FCA5A5]"
                                    title="Delete filter"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-3">
                                <Button size="sm" variant="secondary" onClick={() => handleLoadSavedFilter(item)}>
                                    Load Filter
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default DiscoverSkillsPage;

