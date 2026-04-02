import { Link } from 'react-router-dom';
import { Sparkles, Repeat2 } from 'lucide-react';
import { Button } from '../ui/Button';

const DashboardSuggestedSwapsSection = ({ matches, onQuickSwap }) => {
    if (!matches.length) return null;

    return (
        <div className="section-card">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="section-title flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" /> Suggested Swaps
                </h2>
                <Link to="/discover" className="text-sm text-[#8DA0BF] hover:text-[#0A4D9F]">Browse all</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {matches.map((m) => (
                    <div key={m.userId} className="h-full rounded-2xl border border-white/10 bg-[#0E1620] p-4 transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                        <div className="mb-3 flex items-center gap-3">
                            {m.avatarUrl ? (
                                <img src={m.avatarUrl} alt={m.username || 'User'} loading="lazy" className="h-10 w-10 rounded-full border border-white/10 object-cover" />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A4D9F]/25 text-sm font-bold text-[#DCE7F5]">
                                    {(m.username || 'U')[0].toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <Link to={`/u/${m.username}`} className="block truncate text-sm font-semibold text-[#DCE7F5] hover:text-[#0A4D9F]">
                                    {m.username}
                                </Link>
                                <span className="text-xs text-[#F59E0B]">{m.avgRating > 0 ? `${m.avgRating} ★ (${m.reviewCount})` : 'New user'}</span>
                            </div>
                        </div>

                        <div className="mb-3 rounded-lg border border-white/10 bg-[#0F172A] p-3">
                            <div className="flex items-center justify-center gap-4">
                                <div className="w-24 rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-center">
                                    <p className="truncate text-sm text-white">{m.mutualLearnSkills?.[0]?.skillName || 'Not set'}</p>
                                    <p className="mt-1 text-xs text-gray-400">Teaches</p>
                                </div>
                                <Repeat2 className="h-4 w-4 text-gray-400" />
                                <div className="w-24 rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-center">
                                    <p className="truncate text-sm text-white">{m.matchingTeachSkills?.[0]?.skillName || 'Not set'}</p>
                                    <p className="mt-1 text-xs text-gray-400">Learns</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-3">
                            <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Availability</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(m.availability || []).slice(0, 4).map((day) => (
                                    <span key={`${m.userId}-${day}`} className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
                                        {String(day).slice(0, 3)}
                                    </span>
                                ))}
                                {(!m.availability || m.availability.length === 0) && (
                                    <span className="text-xs text-gray-400">Not set</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto flex gap-2">
                            <Link to={`/u/${m.username}`} className="flex-1">
                                <Button size="sm" variant="secondary" className="w-full border border-white/10 bg-transparent text-gray-300 hover:bg-white/5">
                                    View Profile
                                </Button>
                            </Link>
                            <Button
                                size="sm"
                                className="flex-1 bg-blue-600 text-white hover:bg-blue-500"
                                onClick={() => onQuickSwap(m.userId, m.matchingTeachSkills?.[0]?.skillId)}
                            >
                                Request Swap
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardSuggestedSwapsSection;
