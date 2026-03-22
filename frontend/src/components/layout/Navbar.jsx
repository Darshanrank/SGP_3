// src/components/layout/Navbar.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navLinkClass = ({ isActive }) =>
    clsx(
        'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200',
        isActive
            ? 'border-[#0A4D9F] text-[#DCE7F5]'
            : 'border-transparent text-[#8DA0BF] hover:border-white/20 hover:text-[#0A4D9F]'
    );

const mobileLinkClass = ({ isActive }) =>
    clsx(
        'block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200',
        isActive
            ? 'bg-[#151D27] border-[#0A4D9F] text-[#DCE7F5]'
            : 'border-transparent text-[#8DA0BF] hover:bg-[#151D27] hover:border-white/10 hover:text-[#0A4D9F]'
    );

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isAdmin = user?.role === 'ADMIN' || user?.isAdmin;
    const displayName = user?.profile?.fullName?.trim() || user?.fullName?.trim() || user?.username || user?.email || 'User';
    const secondaryIdentity = user?.username ? `@${user.username}` : user?.email || '';

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <nav className="border-b border-white/5 bg-[#0B111A]/85 backdrop-blur-md">
            <div className="app-container">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="shrink-0 flex items-center">
                            <span className="text-xl font-bold tracking-tight text-[#DCE7F5]">SkillSwap</span>
                        </Link>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {!user && (
                                <NavLink to="/" className={navLinkClass}>
                                    Home
                                </NavLink>
                            )}
                            {user && (
                                <>
                                    <NavLink to="/dashboard" className={navLinkClass}>
                                        Dashboard
                                    </NavLink>
                                    <NavLink to="/discover" className={navLinkClass}>
                                        Discover
                                    </NavLink>
                                    <NavLink to="/skills" className={navLinkClass}>
                                        My Skills
                                    </NavLink>
                                    <NavLink to="/swaps" className={navLinkClass}>
                                        Swaps
                                    </NavLink>
                                    <NavLink to="/calendar" className={navLinkClass}>
                                        Calendar
                                    </NavLink>
                                    <NavLink to="/notifications" className={navLinkClass}>
                                        Notifications
                                    </NavLink>
                                    <NavLink to="/rewards" className={navLinkClass}>
                                        Rewards
                                    </NavLink>
                                    <NavLink to="/leaderboard" className={navLinkClass}>
                                        Leaderboard
                                    </NavLink>
                                    {isAdmin && (
                                        <NavLink to="/admin/reports" className={navLinkClass}>
                                            Admin
                                        </NavLink>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        {user ? (
                            <div className="ml-3 relative flex items-center space-x-4">
                                <span className="text-[#DCE7F5] text-sm font-medium">{displayName}</span>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-full p-1 text-[#8DA0BF] hover:text-[#DCE7F5] focus:outline-none focus:ring-2 focus:ring-[#0A4D9F]/70"
                                >
                                    <LogOut className="h-6 w-6" aria-hidden="true" />
                                </button>
                                <Link to="/profile" className="rounded-full p-1 text-[#8DA0BF] hover:text-[#DCE7F5] focus:outline-none focus:ring-2 focus:ring-[#0A4D9F]/70">
                                   {user?.profile?.avatarUrl ? (
                                       <img src={user.profile.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                                   ) : (
                                       <User className="h-6 w-6" />
                                   )}
                                </Link>
                            </div>
                        ) : (
                            <div className="flex space-x-4">
                                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-[#8DA0BF] hover:bg-[#151D27] hover:text-[#DCE7F5]">
                                    Sign in
                                </Link>
                                <Link to="/register" className="rounded-lg bg-[#0A4D9F] px-4 py-2 text-sm font-medium text-white hover:bg-[#083A78]">
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                    
                    {/* Mobile menu button */}
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex items-center justify-center rounded-md p-2 text-[#8DA0BF] hover:bg-[#151D27] hover:text-[#DCE7F5] focus:outline-none focus:ring-2 focus:ring-[#0A4D9F]/70"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <X className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className={clsx("sm:hidden", isMenuOpen ? "block" : "hidden")}>
                <div className="app-container">
                    <div className="pt-2 pb-3 space-y-1">
                        {!user && (
                            <NavLink to="/" className={mobileLinkClass}>
                                Home
                            </NavLink>
                        )}
                        {user && (
                            <>
                                <NavLink to="/dashboard" className={mobileLinkClass}>
                                    Dashboard
                                </NavLink>
                                <NavLink to="/discover" className={mobileLinkClass}>
                                    Discover
                                </NavLink>
                                <NavLink to="/skills" className={mobileLinkClass}>
                                    My Skills
                                </NavLink>
                                <NavLink to="/swaps" className={mobileLinkClass}>
                                    Swaps
                                </NavLink>
                                <NavLink to="/calendar" className={mobileLinkClass}>
                                    Calendar
                                </NavLink>
                                <NavLink to="/notifications" className={mobileLinkClass}>
                                    Notifications
                                </NavLink>
                                <NavLink to="/rewards" className={mobileLinkClass}>
                                    Rewards
                                </NavLink>
                                <NavLink to="/leaderboard" className={mobileLinkClass}>
                                    Leaderboard
                                </NavLink>
                                {isAdmin && (
                                    <>
                                        <NavLink to="/admin/reports" className={mobileLinkClass}>
                                            Admin Reports
                                        </NavLink>
                                        <NavLink to="/admin/badges" className={mobileLinkClass}>
                                            Admin Badges
                                        </NavLink>
                                        <NavLink to="/admin/penalties" className={mobileLinkClass}>
                                            Admin Penalties
                                        </NavLink>
                                    </>
                                )}
                                <NavLink to="/profile" className={mobileLinkClass}>
                                    Profile
                                </NavLink>
                                 <button
                                    onClick={handleLogout}
                                    className="block w-full border-l-4 border-transparent py-2 pl-3 pr-4 text-left text-base font-medium text-[#8DA0BF] hover:border-white/10 hover:bg-[#151D27] hover:text-[#DCE7F5]"
                                >
                                    Log out
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="border-t border-white/5 pt-4 pb-4">
                    <div className="app-container">
                        {user ? (
                            <div className="flex items-center px-0">
                                <div className="shrink-0">
                                    {user?.profile?.avatarUrl ? (
                                        <img src={user.profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                                    ) : (
                                        <User className="h-10 w-10 rounded-full bg-[#151D27] p-2 text-[#8DA0BF]" />
                                    )}
                                </div>
                                <div className="ml-3">
                                    <div className="text-base font-medium text-[#DCE7F5]">{displayName}</div>
                                    <div className="text-sm font-medium text-[#8DA0BF]">{secondaryIdentity || user.email}</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="ml-auto shrink-0 rounded-full p-1 text-[#8DA0BF] hover:bg-[#151D27] hover:text-[#DCE7F5] focus:outline-none focus:ring-2 focus:ring-[#0A4D9F]/70"
                                >
                                    <LogOut className="h-6 w-6" aria-hidden="true" />
                                </button>
                            </div>
                        ) : (
                            <div className="mt-3 space-y-1 px-0">
                                 <Link to="/login" className="block w-full rounded-lg border border-white/10 py-2 text-center text-sm font-medium text-[#DCE7F5] hover:bg-[#151D27]">
                                    Sign in
                                </Link>
                                <Link to="/register" className="mt-2 block w-full rounded-lg border border-transparent bg-[#0A4D9F] py-2 text-center text-sm font-medium text-white hover:bg-[#083A78]">
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
