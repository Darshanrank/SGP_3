import { StatCardSkeleton } from '../ui/Skeleton';

const DashboardStatsGrid = ({ loading, stats }) => {
    return (
        <div className="stats-grid">
            {loading ? (
                <>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </>
            ) : (
                stats.map((item) => (
                    <div key={item.name} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111721] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-1 hover:bg-[#151D27]">
                        <dt>
                            <div className={`absolute top-5 left-5 rounded-md p-3 ${item.color}`}>
                                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-[#8DA0BF]">{item.name}</p>
                        </dt>
                        <dd className="ml-16 mt-2 flex items-baseline">
                            <p className="text-2xl font-semibold text-[#DCE7F5]">{item.stat}</p>
                        </dd>
                    </div>
                ))
            )}
        </div>
    );
};

export default DashboardStatsGrid;
