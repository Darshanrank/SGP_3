import { Link } from 'react-router-dom';

const DashboardOnlineNowSection = ({ onlineUsers }) => {
    return (
        <div className="section-card rounded-xl border border-white/10 bg-[#0F172A] p-5">
            <h2 className="section-title mb-4">Online Now</h2>
            {onlineUsers.length === 0 ? (
                <p className="text-sm text-gray-400">No online users right now.</p>
            ) : (
                <div className="space-y-3">
                    {onlineUsers.map((person) => (
                        <div key={person.userId} className="group flex items-center justify-between rounded-lg p-2 transition hover:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="relative h-8 w-8 rounded-full bg-gray-700">
                                    {person.avatarUrl ? (
                                        <img src={person.avatarUrl} alt={person.username} loading="lazy" className="h-8 w-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A4D9F]/30 text-xs font-semibold text-white">
                                            {(person.username || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#0F172A] bg-green-400" />
                                </div>
                                <p className="text-sm text-white">{person.username}</p>
                            </div>
                            <div className="hidden items-center gap-2 group-hover:flex">
                                <Link to={`/u/${person.username}`} className="text-xs text-[#8DA0BF] hover:text-white">View Profile</Link>
                                <Link to="/swaps" className="text-xs text-[#8DA0BF] hover:text-white">Send Message</Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardOnlineNowSection;
