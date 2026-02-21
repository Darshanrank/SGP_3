// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, BookOpen, Users, CheckCircle } from 'lucide-react';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-16">
            {/* Hero Section */}
            <section className="text-center py-20 px-4 sm:px-6 lg:px-8 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                    <span className="block">Barter your skills</span>
                    <span className="block text-blue-600">Learn something new</span>
                </h1>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                    Exchange your expertise for knowledge. Teach what you know, learn what you don't. Connect with a community of lifelong learners.
                </p>
                <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                    {user ? (
                        <>
                            <div className="rounded-md shadow">
                                <Link
                                    to="/dashboard"
                                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                                >
                                    Go to Dashboard
                                </Link>
                            </div>
                            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                                <Link
                                    to="/profile"
                                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                                >
                                    View Profile
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-md shadow">
                                <Link
                                    to="/register"
                                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                                >
                                    Get started
                                </Link>
                            </div>
                            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                                <Link
                                    to="/login"
                                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                                >
                                    Log in
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Learn New Skills</h3>
                        <p className="mt-2 text-base text-gray-500">
                            Find experts in programming, design, languages, and more ready to teach you.
                        </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mb-4">
                            <Users className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Connect with Peers</h3>
                        <p className="mt-2 text-base text-gray-500">
                            Join a community of passionate learners and teachers from around the world.
                        </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mb-4">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Track Progress</h3>
                        <p className="mt-2 text-base text-gray-500">
                            Set goals, track your learning journey, and earn badges as you grow.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
