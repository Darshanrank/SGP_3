import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicProfile, getPublicProfileByUsername } from '../services/profile.service';
import { getUserRating, getUserReviews } from '../services/review.service';
import { Star, Github, Linkedin, Globe, Youtube, ExternalLink, ChevronDown, ChevronUp, Trophy, Award, Zap, ArrowRightLeft, Play } from 'lucide-react';

const levelLabel = { LOW: 'Beginner', MEDIUM: 'Intermediate', HIGH: 'Advanced' };
const levelColor = { LOW: 'bg-blue-100 text-blue-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-green-100 text-green-700' };

const SocialLink = ({ href, icon: Icon, label, color }) => {
    if (!href) return null;
    const url = href.startsWith('http') ? href : `https://${href}`;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${color}`}>
            <Icon className="h-4 w-4" />
            {label}
        </a>
    );
};

const TeachSkillCard = ({ skill }) => {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = skill.preview?.videoUrl || skill.proofUrl;

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden transition-shadow hover:shadow-md">
            <button
                type="button"
                onClick={() => hasDetails && setExpanded(!expanded)}
                className={`w-full flex items-center justify-between p-4 text-left ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
            >
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{skill.skill.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[skill.level] || 'bg-gray-100 text-gray-600'}`}>
                        {levelLabel[skill.level] || skill.level}
                    </span>
                </div>
                {hasDetails && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <><Play className="h-3 w-3" /><ChevronDown className="h-4 w-4" /></>}
                    </span>
                )}
            </button>

            {expanded && hasDetails && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {skill.preview?.videoUrl && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Video Demo</p>
                            <video
                                src={skill.preview.videoUrl}
                                controls
                                className="w-full rounded-lg border border-gray-200 max-h-64"
                            />
                        </div>
                    )}
                    {skill.proofUrl && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Proof Link</p>
                            <a
                                href={skill.proofUrl.startsWith('http') ? skill.proofUrl : `https://${skill.proofUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {skill.proofUrl}
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const PublicProfile = () => {
    const { userId, username } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState({ avgRating: 0, reviewCount: 0 });
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = username
                    ? await getPublicProfileByUsername(username)
                    : await getPublicProfile(userId);
                setProfile(data);

                const uid = data?.userId;
                if (uid) {
                    const [ratingData, reviewsData] = await Promise.all([
                        getUserRating(uid).catch(() => ({ avgRating: 0, reviewCount: 0 })),
                        getUserReviews(uid, 1, 5).catch(() => ({ data: [] }))
                    ]);
                    setRating(ratingData);
                    setReviews(reviewsData?.data || []);
                }
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setLoading(false);
            }
        };

        if (username || userId) fetchProfile();
    }, [username, userId]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="w-28 h-28 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-3 w-full">
                            <div className="h-8 bg-gray-200 rounded w-48" />
                            <div className="h-4 bg-gray-200 rounded w-32" />
                            <div className="h-20 bg-gray-200 rounded w-full" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="max-w-4xl mx-auto py-16 text-center">
                <div className="text-6xl mb-4">😕</div>
                <h2 className="text-2xl font-bold text-gray-900">Profile not found</h2>
                <p className="text-gray-500 mt-2">This user doesn't exist or their profile is unavailable.</p>
            </div>
        );
    }

    const displayName = profile.profile?.fullName || profile.username || 'User';
    const teachSkills = profile.userSkills?.filter((skill) => skill.type === 'TEACH') || [];
    const learnSkills = profile.userSkills?.filter((skill) => skill.type === 'LEARN') || [];
    const badges = profile.badges || [];
    const reward = profile.rewards || { points: 0, totalSwaps: 0 };
    const p = profile.profile || {};

    const socialLinks = [
        { href: p.githubLink, icon: Github, label: 'GitHub', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
        { href: p.linkedinLink, icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
        { href: p.portfolioLink, icon: Globe, label: 'Portfolio', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
        { href: p.youtubeLink, icon: Youtube, label: 'YouTube', color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ].filter(l => l.href);

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            {/* ───── Profile Header ───── */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {p.avatarUrl ? (
                        <img
                            src={p.avatarUrl}
                            alt={displayName}
                            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"
                        />
                    ) : (
                        <div className="w-28 h-28 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-md">
                            {displayName[0].toUpperCase()}
                        </div>
                    )}

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                        {profile.profile?.fullName && profile.username && (
                            <p className="text-gray-500 text-sm">@{profile.username}</p>
                        )}
                        <p className="text-gray-400 text-sm mt-1">Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

                        {/* Rating */}
                        {rating.reviewCount > 0 && (
                            <div className="mt-2 flex items-center gap-2 justify-center md:justify-start">
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`h-4 w-4 ${s <= Math.round(rating.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-gray-700">{Number(rating.avgRating).toFixed(1)}</span>
                                <span className="text-sm text-gray-500">({rating.reviewCount} review{rating.reviewCount !== 1 ? 's' : ''})</span>
                            </div>
                        )}

                        {/* Social Links */}
                        {socialLinks.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                                {socialLinks.map(link => (
                                    <SocialLink key={link.label} {...link} />
                                ))}
                            </div>
                        )}

                        {/* Bio */}
                        <div className="mt-5">
                            {p.bio ? (
                                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: p.bio }} />
                            ) : (
                                <p className="text-gray-400 italic">No bio yet.</p>
                            )}
                        </div>

                        {p.learningLanguage && (
                            <div className="mt-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                    🌐 Learning: {p.learningLanguage}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ───── Ranking & Stats ───── */}
            <div className="bg-linear-to-r from-amber-50 via-yellow-50 to-orange-50 rounded-xl border border-amber-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Trophy className="h-5 w-5 text-amber-500" /> Rankings & Stats
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-amber-100">
                        <Zap className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-gray-900">{reward.points}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Points</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-amber-100">
                        <ArrowRightLeft className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-gray-900">{reward.totalSwaps}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Swaps</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-amber-100">
                        <Star className="h-6 w-6 text-yellow-400 mx-auto mb-1 fill-yellow-400" />
                        <p className="text-2xl font-bold text-gray-900">{rating.reviewCount > 0 ? Number(rating.avgRating).toFixed(1) : '—'}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avg Rating</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-amber-100">
                        <Award className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-gray-900">{badges.length}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Badges</p>
                    </div>
                </div>

                {/* Badges list */}
                {badges.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {badges.map((b) => (
                            <span
                                key={b.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-sm font-medium text-amber-800 border border-amber-200 shadow-sm"
                                title={b.badge.condition}
                            >
                                <Award className="h-3.5 w-3.5 text-amber-500" />
                                {b.badge.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ───── Skills ───── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Teaching Skills */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-green-700 flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-green-500 rounded-full" /> Can Teach
                        <span className="ml-auto text-sm font-normal text-gray-400">{teachSkills.length}</span>
                    </h2>
                    {teachSkills.length > 0 ? (
                        <div className="space-y-3">
                            {teachSkills.map(skill => (
                                <TeachSkillCard key={skill.id} skill={skill} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm italic">No teaching skills listed yet.</p>
                    )}
                </div>

                {/* Learning Skills */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-blue-700 flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" /> Wants to Learn
                        <span className="ml-auto text-sm font-normal text-gray-400">{learnSkills.length}</span>
                    </h2>
                    {learnSkills.length > 0 ? (
                        <ul className="space-y-2">
                            {learnSkills.map(skill => (
                                <li key={skill.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                    <span className="font-medium text-gray-900">{skill.skill.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[skill.level] || 'bg-gray-100 text-gray-600'}`}>
                                        {levelLabel[skill.level] || skill.level}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-400 text-sm italic">No learning goals listed yet.</p>
                    )}
                </div>
            </div>

            {/* ───── Reviews ───── */}
            {reviews.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews</h2>
                    <div className="space-y-4">
                        {reviews.map((r) => (
                            <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-sm text-gray-800">{r.reviewer?.username || 'User'}</span>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`h-4 w-4 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                                <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicProfile;
