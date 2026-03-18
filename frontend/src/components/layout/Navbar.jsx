// src/components/layout/Navbar.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navLinkClass = ({ isActive }) =>
    clsx(
        'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
        isActive
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    );

const mobileLinkClass = ({ isActive }) =>
    clsx(
        'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
        isActive
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
    );

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isAdmin = user?.role === 'ADMIN' || user?.isAdmin;

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="app-container">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="shrink-0 flex items-center">
                            <span className="text-xl font-bold text-blue-600">SkillSwap</span>
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
                                    <NavLink to="/skills" className={navLinkClass}>
                                        Skills
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
                                <span className="text-gray-700 text-sm font-medium">{user.username || user.email}</span>
                                <button
                                    onClick={handleLogout}
                                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <LogOut className="h-6 w-6" aria-hidden="true" />
                                </button>
                                <Link to="/profile" className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                   {user?.profile?.avatarUrl ? (
                                       <img src={user.profile.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                                   ) : (
                                       <User className="h-6 w-6" />
                                   )}
                                </Link>
                            </div>
                        ) : (
                            <div className="flex space-x-4">
                                <Link to="/login" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                    Sign in
                                </Link>
                                <Link to="/register" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium">
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                    
                    {/* Mobile menu button */}
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                                    className="w-full text-left border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                                >
                                    Log out
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="pt-4 pb-4 border-t border-gray-200">
                    <div className="app-container">
                        {user ? (
                            <div className="flex items-center px-0">
                                <div className="shrink-0">
                                    {user?.profile?.avatarUrl ? (
                                        <img src={user.profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                                    ) : (
                                        <User className="h-10 w-10 rounded-full bg-gray-100 p-2" />
                                    )}
                                </div>
                                <div className="ml-3">
                                    <div className="text-base font-medium text-gray-800">{user.username}</div>
                                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="ml-auto shrink-0 bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <LogOut className="h-6 w-6" aria-hidden="true" />
                                </button>
                            </div>
                        ) : (
                            <div className="mt-3 space-y-1 px-0">
                                 <Link to="/login" className="block text-center w-full border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Sign in
                                </Link>
                                <Link to="/register" className="block text-center w-full mt-2 bg-blue-600 border border-transparent rounded-md py-2 text-sm font-medium text-white hover:bg-blue-700">
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
