import { Button } from '../ui/Button';
import { CheckCircle, Clock, Plus, Repeat2 } from 'lucide-react';

const SwapsHeaderStats = ({ navigate, activeSwapsCount, pendingRequestsCount, completedSwapsCount }) => {
    return (
        <>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="page-title">My Swaps</h1>
                    <p className="mt-0.5 text-sm text-[#8DA0BF]">Manage your skill swap requests and classrooms</p>
                </div>
                <Button onClick={() => navigate('/swaps/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Request
                </Button>
            </div>

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                <article className="rounded-xl border border-white/10 bg-[#0F172A] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-white/10 bg-[#111721] p-2">
                            <Repeat2 className="h-4 w-4 text-[#9FC8FF]" />
                        </div>
                        <p className="text-sm text-gray-400">Active Swaps</p>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{activeSwapsCount}</p>
                </article>

                <article className="rounded-xl border border-white/10 bg-[#0F172A] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-white/10 bg-[#111721] p-2">
                            <Clock className="h-4 w-4 text-yellow-400" />
                        </div>
                        <p className="text-sm text-gray-400">Pending Requests</p>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{pendingRequestsCount}</p>
                </article>

                <article className="rounded-xl border border-white/10 bg-[#0F172A] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-white/10 bg-[#111721] p-2">
                            <CheckCircle className="h-4 w-4 text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-400">Completed Swaps</p>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{completedSwapsCount}</p>
                </article>
            </section>
        </>
    );
};

export default SwapsHeaderStats;
