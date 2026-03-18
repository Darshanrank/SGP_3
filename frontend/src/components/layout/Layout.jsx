// src/components/layout/Layout.jsx
import Navbar from './Navbar';
import { Toaster } from 'react-hot-toast';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="grow w-full">
                <div className="app-container app-main">
                    {children}
                </div>
            </main>
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="app-container py-6">
                    <p className="text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} SkillSwap Platform. All rights reserved.
                    </p>
                </div>
            </footer>
            <Toaster position="top-right" />
        </div>
    );
};

export default Layout;
