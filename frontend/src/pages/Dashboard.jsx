// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ArrowRightLeft, Users, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/meta.service';

const Dashboard = () => {
    const { user } = useAuth();
    const [statsData, setStatsData] = useState(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await getDashboardStats();
                setStatsData(data);
            } catch (error) {
                console.error('Failed to load dashboard stats', error);
            }
        };

        loadStats();
    }, []);

    const stats = [
        { name: 'Active Swaps', stat: String(statsData?.activeSwaps ?? 0), icon: ArrowRightLeft, color: 'bg-blue-500' },
        { name: 'Skills Teaching', stat: String(statsData?.teaching ?? 0), icon: BookOpen, color: 'bg-green-500' },
        { name: 'Skills Learning', stat: String(statsData?.learning ?? 0), icon: Users, color: 'bg-indigo-500' },
        { name: 'Points', stat: String(statsData?.points ?? 0), icon: Star, color: 'bg-yellow-500' },
    ];

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.username}!</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((item) => (
                    <div key={item.name} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden border border-gray-100">
                        <dt>
                            <div className={`absolute rounded-md p-3 ${item.color}`}>
                                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
                        </dt>
                        <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                            <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
                        </dd>
                    </div>
                ))}
            </div>

            {/* Recent Activity / Quick Actions */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/skills/new" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500 text-gray-500 transition-colors">
                            <span className="font-medium">+ Add Skill</span>
                        </Link>
                        <Link to="/swaps/new" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:text-green-500 text-gray-500 transition-colors">
                            <span className="font-medium">Find Swap</span>
                        </Link>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Recent Notifications</h2>
                        <Link to="/notifications" className="text-sm text-blue-600 hover:text-blue-500">View all</Link>
                     </div>
                     <div className="text-center text-gray-500 py-8">
                        No new notifications
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
