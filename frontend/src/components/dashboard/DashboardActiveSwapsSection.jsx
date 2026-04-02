import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

const DashboardActiveSwapsSection = ({ activeSwaps, nextSessionByClassId, formatSessionTime, onGoToClassroom, user }) => {
    return (
        <div className="section-card">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="section-title">Active Swaps</h2>
                <Link to="/swaps" className="text-sm text-[#8DA0BF] hover:text-[#0A4D9F]">View all</Link>
            </div>

            {activeSwaps.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center">
                    <p className="text-sm text-gray-400">No active swaps right now.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeSwaps.slice(0, 4).map((swap) => {
                        const teachSkill = swap?.swapRequest?.teachSkill?.skill?.name || 'Skill';
                        const learnSkill = swap?.swapRequest?.learnSkill?.skill?.name || 'Skill';
                        const sessionDate = nextSessionByClassId[swap.id] || null;
                        const fromUser = swap?.swapRequest?.fromUser;
                        const toUser = swap?.swapRequest?.toUser;
                        const partner = fromUser?.userId === user?.userId ? toUser : fromUser;
                        const partnerTimeZone = partner?.profile?.timezone || null;

                        return (
                            <div key={swap.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F172A] p-4">
                                <div>
                                    <p className="text-sm font-medium text-white">{teachSkill} <span className="mx-1 text-gray-400">⇄</span> {learnSkill}</p>
                                    <p className="mt-1 text-xs text-gray-400">Next session (your local time)</p>
                                    <p className="text-xs text-gray-300">{formatSessionTime(sessionDate, partnerTimeZone)}</p>
                                </div>
                                <Button size="sm" className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-500" onClick={() => onGoToClassroom(swap.id)}>
                                    Go to Classroom
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DashboardActiveSwapsSection;
