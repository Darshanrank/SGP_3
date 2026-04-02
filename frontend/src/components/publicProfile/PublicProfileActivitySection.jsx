const PublicProfileActivitySection = ({ recentActivityItems, badges }) => {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                <h2 className="mb-4 text-lg font-bold text-[#DCE7F5]">Recent Activity</h2>
                {recentActivityItems.length > 0 ? (
                    <div className="space-y-3">
                        {recentActivityItems.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2.5">
                                <span className="text-base leading-5">{activity.icon}</span>
                                <div>
                                    <p className="text-sm text-[#DCE7F5]">{activity.text}</p>
                                    <p className="text-xs text-[#8DA0BF]">{activity.timeAgo}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-[#8DA0BF]">No recent activity yet.</p>
                )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                <h2 className="mb-4 text-lg font-bold text-[#DCE7F5]">Achievements</h2>
                {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {badges.map((badgeEntry) => (
                            <div
                                key={badgeEntry.id}
                                className="inline-flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-sm text-[#FCD34D]"
                                title={badgeEntry.badge?.condition || 'Achievement badge'}
                            >
                                <span>🏅</span>
                                <span className="font-medium">{badgeEntry.badge?.name || 'Badge'}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-[#8DA0BF]">No achievements yet.</p>
                )}
            </div>
        </div>
    );
};

export default PublicProfileActivitySection;
