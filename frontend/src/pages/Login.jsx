// src/pages/Login.jsx
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { Button } from '../components/ui/Button';

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: { rememberMe: false }
    });
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false); // Add loading state
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = async (data) => {
        setIsLoading(true); // Start loading
        try {
            await login(data);
            toast.success('Successfully logged in!');
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false); // Stop loading
        }
    };

    return (
        <div className="page-shell">
            <div className="mx-auto w-full max-w-md">
                <header className="mb-6 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#DCE7F5]">Welcome Back</h1>
                    <p className="mt-2 text-sm text-[#8DA0BF]">
                        Sign in to continue your SkillSwap journey.
                    </p>
                    <p className="mt-2 text-sm text-[#8DA0BF]">
                        New here?{' '}
                        <Link to="/register" className="font-medium text-[#7BB2FF] hover:text-[#9FC8FF]">
                            Create an account
                        </Link>
                    </p>
                </header>

                <section className="section-card">
                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#DCE7F5]">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: 'Invalid email address'
                                    }
                                })}
                                className="w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2.5 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                placeholder="you@example.com"
                            />
                            {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-[#DCE7F5]">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="text-xs font-medium text-[#7BB2FF] hover:text-[#9FC8FF]"
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                {...register('password', { required: 'Password is required' })}
                                className="w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2.5 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                placeholder="Enter your password"
                            />
                            {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="remember-me" className="inline-flex items-center gap-2 text-sm text-[#8DA0BF]">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    {...register('rememberMe')}
                                    className="h-4 w-4 rounded border-white/10 bg-[#0E1620]"
                                />
                                Remember me
                            </label>

                            <Link to="/forgot-password" className="text-sm font-medium text-[#7BB2FF] hover:text-[#9FC8FF]">
                                Forgot password?
                            </Link>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default Login;
