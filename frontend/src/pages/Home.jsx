// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Star, BookOpen, Users, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getFeaturedProfiles } from '../services/profile.service';

const Home = () => {
    const { user } = useAuth();
    const [featuredProfiles, setFeaturedProfiles] = useState([]);
    const [loadingProfiles, setLoadingProfiles] = useState(true);
    const [activeCategory, setActiveCategory] = useState('');

    useEffect(() => {
        let mounted = true;
        const loadFeaturedProfiles = async () => {
            setLoadingProfiles(true);
            try {
                const res = await getFeaturedProfiles(8);
                if (mounted) {
                    setFeaturedProfiles(Array.isArray(res?.data) ? res.data : []);
                }
            } catch (error) {
                console.error('Failed to load featured profiles', error);
                if (mounted) setFeaturedProfiles([]);
            } finally {
                if (mounted) setLoadingProfiles(false);
            }
        };

        loadFeaturedProfiles();
        return () => { mounted = false; };
    }, []);

    const categories = useMemo(() => {
        const all = featuredProfiles.flatMap((profile) => profile.categories || []);
        return [...new Set(all)];
    }, [featuredProfiles]);

    const filteredProfiles = useMemo(() => {
        if (!activeCategory) return featuredProfiles;
        return featuredProfiles.filter((profile) => (profile.categories || []).includes(activeCategory));
    }, [featuredProfiles, activeCategory]);

    const getInitials = (name, username) => {
        const source = (name || username || 'U').trim();
        const parts = source.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return source.slice(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-12">
            <section className="section-card max-w-7xl mx-auto px-6 py-16 grid gap-10">
                <div className="space-y-6">
                    <h1 className="max-w-4xl text-balance text-4xl font-extrabold leading-tight text-[#DCE7F5] sm:text-5xl">
                        Barter your skills. Learn something new.
                    </h1>
                    <p className="max-w-3xl text-base text-[#8DA0BF] sm:text-lg">
                        Discover people who can teach what you want, and trade knowledge in return.
                        SkillSwap keeps learning practical, social, and measurable.
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0E1620] p-4 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                        <input placeholder="Skill" className="h-11 px-3" />
                        <select className="h-11 px-3">
                            <option>Category</option>
                            {categories.map((category) => (
                                <option key={category}>{category}</option>
                            ))}
                        </select>
                        <select className="h-11 px-3">
                            <option>Availability</option>
                            <option>Weekdays</option>
                            <option>Weekends</option>
                            <option>Evenings</option>
                        </select>
                        <Link
                            to={user ? '/skills' : '/register'}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0A4D9F] px-5 text-sm font-semibold text-white transition hover:bg-[#083A78]"
                        >
                            <Search className="h-4 w-4" />
                            Find Swap
                        </Link>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => setActiveCategory((prev) => (prev === category ? '' : category))}
                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${activeCategory === category ? 'border-[#0A4D9F] bg-[#0A4D9F]/20 text-[#DCE7F5]' : 'border-white/10 bg-[#111721] text-[#8DA0BF] hover:bg-[#151D27] hover:text-[#DCE7F5]'}`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {loadingProfiles && [...Array(4)].map((_, idx) => (
                        <article key={`skeleton-${idx}`} className="rounded-2xl border border-white/10 bg-[#111721] p-4 animate-pulse">
                            <div className="h-6 w-32 rounded bg-[#1D2733]" />
                            <div className="mt-4 h-4 w-20 rounded bg-[#1D2733]" />
                            <div className="mt-4 h-4 w-full rounded bg-[#1D2733]" />
                            <div className="mt-2 h-4 w-2/3 rounded bg-[#1D2733]" />
                            <div className="mt-4 h-10 w-full rounded-xl bg-[#1D2733]" />
                        </article>
                    ))}

                    {!loadingProfiles && filteredProfiles.map((teacher) => (
                        <article
                            key={teacher.userId}
                            className="rounded-2xl border border-white/10 bg-[#111721] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A4D9F]/25 text-sm font-semibold text-[#DCE7F5] overflow-hidden">
                                        {teacher.avatarUrl ? (
                                            <img src={teacher.avatarUrl} alt={teacher.fullName || teacher.username} className="h-full w-full object-cover" />
                                        ) : (
                                            getInitials(teacher.fullName, teacher.username)
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-[#DCE7F5]">{teacher.fullName || teacher.username}</h3>
                                        <p className="inline-flex items-center gap-1 text-xs text-[#F59E0B]">
                                            <Star className="h-3.5 w-3.5 fill-current" />
                                            {teacher.avgRating > 0 ? teacher.avgRating : 'New'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                                <p>
                                    <span className="text-[#8DA0BF]">Teaches:</span>{' '}
                                    <span className="text-[#DCE7F5]">{(teacher.teachSkills || []).slice(0, 2).join(', ') || 'Not listed'}</span>
                                </p>
                                <p>
                                    <span className="text-[#8DA0BF]">Wants:</span>{' '}
                                    <span className="text-[#DCE7F5]">{(teacher.learnSkills || []).slice(0, 2).join(', ') || 'Open to learn'}</span>
                                </p>
                            </div>
                            <Link
                                to={user ? `/swaps/new?to=${encodeURIComponent(teacher.username)}` : '/register'}
                                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#0A4D9F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#083A78]"
                            >
                                Request Swap
                            </Link>
                        </article>
                    ))}

                    {!loadingProfiles && filteredProfiles.length === 0 && (
                        <article className="col-span-full rounded-2xl border border-white/10 bg-[#111721] p-6 text-center">
                            <p className="text-[#8DA0BF]">No featured teachers found for this category yet.</p>
                        </article>
                    )}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <article className="section-card text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A4D9F]/25 text-[#DCE7F5]">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#DCE7F5]">Learn New Skills</h3>
                    <p className="mt-2 text-sm text-[#8DA0BF]">Explore teachers across programming, design, marketing, language, and business.</p>
                </article>
                <article className="section-card text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#22C55E]/20 text-[#22C55E]">
                        <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#DCE7F5]">Connect with Peers</h3>
                    <p className="mt-2 text-sm text-[#8DA0BF]">Trade expertise with people who value practical, two-way learning.</p>
                </article>
                <article className="section-card text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/20 text-[#F59E0B]">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#DCE7F5]">Track Progress</h3>
                    <p className="mt-2 text-sm text-[#8DA0BF]">Build your reputation with completed swaps, ratings, and badges.</p>
                </article>
            </section>

            <section className="flex flex-wrap gap-3">
                {user ? (
                    <>
                        <Link to="/dashboard" className="rounded-xl bg-[#0A4D9F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#083A78]">
                            Go to Dashboard
                        </Link>
                        <Link to="/profile" className="rounded-xl border border-white/10 bg-[#111721] px-5 py-2.5 text-sm font-semibold text-[#DCE7F5] hover:bg-[#151D27]">
                            View Profile
                        </Link>
                    </>
                ) : (
                    <>
                        <Link to="/register" className="rounded-xl bg-[#0A4D9F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#083A78]">
                            Get Started
                        </Link>
                        <Link to="/login" className="rounded-xl border border-white/10 bg-[#111721] px-5 py-2.5 text-sm font-semibold text-[#DCE7F5] hover:bg-[#151D27]">
                            Log In
                        </Link>
                    </>
                )}
            </section>
        </div>
    );
};

export default Home;
