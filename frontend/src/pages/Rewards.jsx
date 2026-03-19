import { useEffect, useState } from 'react';
import { getRewards, getMyBadges, getMyPenalties } from '../services/meta.service';
import { Badge as BadgeIcon, ShieldAlert } from 'lucide-react';

const Rewards = () => {
    const [rewards, setRewards] = useState(null);
    const [badges, setBadges] = useState([]);
    const [penalties, setPenalties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [r, b, p] = await Promise.all([
                    getRewards(),
                    getMyBadges(),
                    getMyPenalties()
                ]);
                setRewards(r);
                setBadges(Array.isArray(b) ? b : b?.data || b || []);
                setPenalties(Array.isArray(p?.data) ? p.data : p || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="section-card text-center">Loading...</div>;

    return (
        <div className="page-shell">
            <h1 className="page-title">Rewards & Reputation</h1>

            <div className="stats-grid">
                {[{ label: 'Points', value: rewards?.points ?? 0 }, { label: 'Total Swaps', value: rewards?.totalSwaps ?? rewards?.swaps ?? 0 }, { label: 'Badges', value: badges.length }].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-[#111721] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                        <p className="text-sm text-[#8DA0BF]">{item.label}</p>
                        <p className="text-2xl font-semibold text-[#DCE7F5]">{item.value}</p>
                    </div>
                ))}
            </div>

            <section className="section-card">
                <h2 className="section-title mb-4 flex items-center gap-2"><BadgeIcon size={18}/> Badges</h2>
                {badges.length === 0 ? <p className="text-[#8DA0BF]">No badges yet.</p> : (
                    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                        {badges.map((b) => (
                            <div key={b.id || b.badgeId} className="rounded-xl border border-white/10 bg-[#0E1620] p-3">
                                <p className="font-semibold text-[#DCE7F5]">{b.badge?.name || b.name}</p>
                                <p className="text-sm text-[#8DA0BF]">{b.badge?.condition || b.condition}</p>
                                <p className="text-xs text-[#6F83A3]">{new Date(b.earnedAt || b.createdAt || Date.now()).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="section-card">
                <h2 className="section-title mb-4 flex items-center gap-2"><ShieldAlert size={18}/> Penalties</h2>
                {penalties.length === 0 ? <p className="text-[#8DA0BF]">No penalties.</p> : (
                    <ul className="space-y-4">
                        {penalties.map((p) => (
                            <li key={p.id} className="rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/10 p-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-[#DCE7F5]">{p.penaltyType}</p>
                                        <p className="text-sm text-[#8DA0BF]">{p.reason}</p>
                                    </div>
                                    <span className="text-xs text-[#8DA0BF]">{new Date(p.createdAt).toLocaleString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default Rewards;
