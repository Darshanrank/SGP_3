// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Star, Users, Repeat2, Calendar, TrendingUp, Code2, Palette, Briefcase, Megaphone, Music2, Languages, Trophy, Mail, Github, Linkedin, Twitter, BadgeDollarSign, CircleHelp, ShieldCheck, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getFeaturedProfiles } from '../services/profile.service';
import { getCommunityStats } from '../services/stats.service';

const Home = () => {
    const { user } = useAuth();
    const [featuredProfiles, setFeaturedProfiles] = useState([]);
    const [loadingProfiles, setLoadingProfiles] = useState(true);
    const [activeCategory, setActiveCategory] = useState('');
    const [stats, setStats] = useState({ learners: 0, swaps: 0, skills: 0 });

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

    useEffect(() => {
        let mounted = true;

        const loadStats = async () => {
            try {
                const payload = await getCommunityStats();
                if (!mounted) return;

                setStats({
                    learners: Number(payload?.learners) || 0,
                    swaps: Number(payload?.swaps) || 0,
                    skills: Number(payload?.skills) || 0
                });
            } catch (error) {
                console.error('Failed to load community stats', error);
                if (mounted) {
                    setStats({ learners: 0, swaps: 0, skills: 0 });
                }
            }
        };

        loadStats();
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

    const popularSkills = ['React', 'Python', 'UI/UX', 'Docker', 'Machine Learning', 'Node.js', 'Data Science'];
    const trendingSkills = ['React', 'Python', 'AI'];
    const exploreCategories = [
        { name: 'Programming', icon: Code2, slug: 'programming' },
        { name: 'Design', icon: Palette, slug: 'design' },
        { name: 'Business', icon: Briefcase, slug: 'business' },
        { name: 'Marketing', icon: Megaphone, slug: 'marketing' },
        { name: 'Music', icon: Music2, slug: 'music' },
        { name: 'Languages', icon: Languages, slug: 'languages' },
    ];

    const formatStat = (value) => Number(value || 0).toLocaleString();

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
                    <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                        <Link
                            to="/signup"
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500"
                        >
                            Start Swapping
                        </Link>
                        <Link
                            to={user ? '/discover' : '/login'}
                            className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-gray-200 transition hover:bg-white/5"
                        >
                            Explore Skills
                        </Link>
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0F172A] p-4">
                    <div className="flex flex-col gap-3 md:flex-row">
                        <input placeholder="Python, React, UI Design..." className="h-11 px-3 md:flex-1" />
                        <select className="h-11 px-3 md:w-48">
                            <option>Programming, Design...</option>
                            {categories.map((category) => (
                                <option key={category}>{category}</option>
                            ))}
                        </select>
                        <select className="h-11 px-3 md:w-48">
                            <option>Weekdays, Weekends...</option>
                            <option>Weekdays</option>
                            <option>Weekends</option>
                            <option>Evenings</option>
                        </select>
                        <Link
                            to={user ? '/skills' : '/register'}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0A4D9F] px-5 text-sm font-semibold text-white transition hover:bg-[#083A78] md:px-6"
                        >
                            <Search className="h-4 w-4" />
                            Find Swap
                        </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8DA0BF]">
                        <span>Trending:</span>
                        {trendingSkills.map((skill) => (
                            <Link
                                key={skill}
                                to={`/discover?skill=${encodeURIComponent(skill.toLowerCase())}`}
                                className="cursor-pointer rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400 transition hover:bg-blue-500/20"
                            >
                                {skill}
                            </Link>
                        ))}
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
                                            <img src={teacher.avatarUrl} alt={teacher.fullName || teacher.username} loading="lazy" className="h-full w-full object-cover" />
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

            <section className="mt-16">
                <h2 className="text-center text-3xl font-bold text-white">Explore Skills</h2>
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {exploreCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <Link
                                key={category.slug}
                                to={`/discover?category=${encodeURIComponent(category.slug)}`}
                                className="cursor-pointer rounded-lg border border-white/10 bg-[#0F172A] p-4 text-center transition hover:border-blue-500/30 hover:bg-[#111827]"
                            >
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A4D9F]/20 text-[#9FC8FF]">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-[#DCE7F5]">{category.name}</p>
                            </Link>
                        );
                    })}
                </div>
            </section>

            <section id="how-skillswap-works" className="mt-16">
                <h2 className="text-center text-3xl font-bold text-white">How SkillSwap Works</h2>
                <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center transition hover:border-blue-500/30">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A4D9F]/20 text-[#9FC8FF]">
                            <Search className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Find a Skill</h3>
                        <p className="mt-2 text-sm text-gray-400">Search for people who can teach the skill you want to learn.</p>
                    </article>
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center transition hover:border-blue-500/30">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A4D9F]/20 text-[#9FC8FF]">
                            <Repeat2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Swap Knowledge</h3>
                        <p className="mt-2 text-sm text-gray-400">Teach something you know in exchange for learning something new.</p>
                    </article>
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center transition hover:border-blue-500/30">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A4D9F]/20 text-[#9FC8FF]">
                            <Users className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Learn Together</h3>
                        <p className="mt-2 text-sm text-gray-400">Schedule sessions and grow your skills together.</p>
                    </article>
                </div>
            </section>

            <section className="mt-16">
                <h2 className="text-center text-3xl font-bold text-white">Popular Skills</h2>
                <div className="mt-6 flex flex-wrap gap-3">
                    {popularSkills.map((skill) => (
                        <Link
                            key={skill}
                            to={`/discover?skill=${encodeURIComponent(skill.toLowerCase())}`}
                            className="cursor-pointer rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-400 transition hover:bg-blue-500/20"
                        >
                            {skill}
                        </Link>
                    ))}
                </div>
            </section>

            <section className="mt-16">
                <h2 className="text-center text-3xl font-bold text-white">Why SkillSwap?</h2>
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center transition hover:border-blue-500/30">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A4D9F]/20 text-[#9FC8FF]">
                            <Repeat2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Skill Bartering</h3>
                        <p className="mt-2 text-sm text-gray-400">Trade knowledge instead of paying money.</p>
                    </article>
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center transition hover:border-blue-500/30">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A4D9F]/20 text-[#9FC8FF]">
                            <Users className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Community Learning</h3>
                        <p className="mt-2 text-sm text-gray-400">Connect with learners and teachers around the world.</p>
                    </article>
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center transition hover:border-blue-500/30">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A4D9F]/20 text-[#9FC8FF]">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Flexible Scheduling</h3>
                        <p className="mt-2 text-sm text-gray-400">Choose learning times that fit your schedule.</p>
                    </article>
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center transition hover:border-blue-500/30">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A4D9F]/20 text-[#9FC8FF]">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Track Progress</h3>
                        <p className="mt-2 text-sm text-gray-400">Monitor your learning journey and completed swaps.</p>
                    </article>
                </div>
            </section>

            <section className="mb-16 mt-16">
                <h2 className="text-center text-3xl font-bold text-white">SkillSwap Community</h2>
                <div className="mt-8 grid grid-cols-1 gap-6 text-center md:grid-cols-3">
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6">
                        <p className="text-3xl font-bold text-white">{formatStat(stats.learners)}+</p>
                        <p className="mt-2 text-sm text-gray-400">Learners</p>
                    </article>
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6">
                        <p className="text-3xl font-bold text-white">{formatStat(stats.swaps)}+</p>
                        <p className="mt-2 text-sm text-gray-400">Skill Swaps</p>
                    </article>
                    <article className="rounded-xl border border-white/10 bg-[#0F172A] p-6">
                        <p className="text-3xl font-bold text-white">{formatStat(stats.skills)}+</p>
                        <p className="mt-2 text-sm text-gray-400">Skills</p>
                    </article>
                </div>
            </section>

            <footer className="mt-12 border-t border-white/10 bg-[#020617] px-6 py-14 md:px-16">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
                    <div>
                        <h3 className="text-xl font-semibold text-white">SkillSwap</h3>
                        <p className="mt-3 text-sm leading-relaxed text-gray-400">Trade skills and learn from people around the world.</p>
                        <div className="mt-4 flex gap-4">
                            <a href="#" aria-label="SkillSwap on GitHub" className="cursor-pointer text-gray-400 transition hover:text-white">
                                <Github className="h-5 w-5" />
                            </a>
                            <a href="#" aria-label="SkillSwap on LinkedIn" className="cursor-pointer text-gray-400 transition hover:text-white">
                                <Linkedin className="h-5 w-5" />
                            </a>
                            <a href="#" aria-label="SkillSwap on Twitter" className="cursor-pointer text-gray-400 transition hover:text-white">
                                <Twitter className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Product</h4>
                        <div className="space-y-3">
                            <Link to="/discover" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <Search className="h-4 w-4" />
                                <span>Discover Skills</span>
                            </Link>
                            <a href="#how-skillswap-works" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <Repeat2 className="h-4 w-4" />
                                <span>How It Works</span>
                            </a>
                            <a href="#" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <BadgeDollarSign className="h-4 w-4" />
                                <span>Pricing</span>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Community</h4>
                        <div className="space-y-3">
                            <Link to="/leaderboard" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <Trophy className="h-4 w-4" />
                                <span>Leaderboard</span>
                            </Link>
                            <a href="#" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <Star className="h-4 w-4" />
                                <span>Reviews</span>
                            </a>
                            <a href="#" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <Users className="h-4 w-4" />
                                <span>Top Teachers</span>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Support</h4>
                        <div className="space-y-3">
                            <a href="#" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <Mail className="h-4 w-4" />
                                <span>Contact</span>
                            </a>
                            <a href="#" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <CircleHelp className="h-4 w-4" />
                                <span>Help Center</span>
                            </a>
                            <a href="#" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Privacy Policy</span>
                            </a>
                            <a href="#" className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                                <FileText className="h-4 w-4" />
                                <span>Terms</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-t border-white/10 pt-6">
                    <p className="text-center text-sm text-gray-500">© 2026 SkillSwap Platform. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
