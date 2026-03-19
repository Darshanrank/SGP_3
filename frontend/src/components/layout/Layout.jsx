// src/components/layout/Layout.jsx
import Navbar from './Navbar';
import { Toaster } from 'react-hot-toast';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            <Navbar />
            <main className="grow w-full">
                <div className="app-container app-main">
                    {children}
                </div>
            </main>
            <footer className="mt-auto border-t border-white/5 bg-[#0B111A]/80 backdrop-blur">
                <div className="app-container py-6">
                    <p className="text-center text-sm text-[#8DA0BF]">
                        &copy; {new Date().getFullYear()} SkillSwap Platform. All rights reserved.
                    </p>
                </div>
            </footer>
            <Toaster position="top-right" />
        </div>
    );
};

export default Layout;
