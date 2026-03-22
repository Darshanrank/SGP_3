// src/components/layout/Layout.jsx
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { Toaster } from 'react-hot-toast';

const Layout = ({ children }) => {
    const location = useLocation();
    const isLandingPage = location.pathname === '/';

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            <Navbar />
            <main className="grow w-full">
                <div className="app-container app-main">
                    {children}
                </div>
            </main>
            {!isLandingPage && (
                <div className="mt-20 border-t border-white/10">
                    <footer className="border-t border-white/10 bg-[#020617] px-6 py-4 md:px-12">
                        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                            <p className="text-sm font-semibold text-white">SkillSwap</p>

                            <nav className="flex flex-wrap gap-5 text-sm">
                                <Link to="/dashboard" className="text-gray-400 transition hover:text-white">Dashboard</Link>
                                <Link to="/discover" className="text-gray-400 transition hover:text-white">Discover</Link>
                                <Link to="/skills" className="text-gray-400 transition hover:text-white">My Skills</Link>
                                <Link to="/swaps" className="text-gray-400 transition hover:text-white">Swaps</Link>
                                <Link to="/calendar" className="text-gray-400 transition hover:text-white">Calendar</Link>
                                <Link to="/notifications" className="text-gray-400 transition hover:text-white">Notifications</Link>
                            </nav>

                            <p className="text-sm text-gray-500">© {new Date().getFullYear()} SkillSwap Platform</p>
                        </div>
                    </footer>
                </div>
            )}
            <Toaster position="top-right" />
        </div>
    );
};

export default Layout;
