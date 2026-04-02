// src/pages/Register.jsx
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { Button } from '../components/ui/Button';

const USERNAME_REGEX = /^[a-z0-9_]+$/;

const Register = () => {
    const { register: registerField, handleSubmit, formState: { errors }, watch } = useForm();
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Watch password to validate confirm password
    const password = watch("password", "");

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await registerUser({
                username: data.username.trim().toLowerCase(),
                email: data.email,
                password: data.password
            });
            toast.success('Registration successful! Please verify your email from Gmail.');
            navigate('/login');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Registration failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-shell">
            <div className="mx-auto w-full max-w-md">
                <header className="mb-6 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#DCE7F5]">Create Account</h1>
                    <p className="mt-2 text-sm text-[#8DA0BF]">Join SkillSwap and start learning by teaching.</p>
                    <p className="mt-2 text-sm text-[#8DA0BF]">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-[#7BB2FF] hover:text-[#9FC8FF]">
                            Sign in
                        </Link>
                    </p>
                </header>

                <section className="section-card">
                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label htmlFor="username" className="mb-2 block text-sm font-medium text-[#DCE7F5]">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                {...registerField('username', {
                                    required: 'Username is required',
                                    minLength: { value: 3, message: 'Username must be at least 3 characters' },
                                    maxLength: { value: 30, message: 'Username can be at most 30 characters' },
                                    pattern: {
                                        value: USERNAME_REGEX,
                                        message: 'Use only lowercase letters, numbers, and underscore (_)'
                                    }
                                })}
                                onInput={(e) => {
                                    e.target.value = e.target.value.toLowerCase();
                                }}
                                className="w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2.5 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                placeholder="your_username"
                            />
                            {errors.username && <p className="mt-1.5 text-xs text-red-400">{errors.username.message}</p>}
                            {!errors.username && <p className="mt-1.5 text-xs text-[#6F83A3]">Allowed: a-z, 0-9, underscore (_)</p>}
                        </div>

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#DCE7F5]">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                {...registerField('email', {
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
                                {...registerField('password', {
                                    required: 'Password is required',
                                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                                    pattern: {
                                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/,
                                        message: 'Password must include uppercase, lowercase, number, and special character'
                                    }
                                })}
                                className="w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2.5 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                placeholder="Create a strong password"
                            />
                            {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#DCE7F5]">
                                    Confirm Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    className="text-xs font-medium text-[#7BB2FF] hover:text-[#9FC8FF]"
                                >
                                    {showConfirmPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                {...registerField('confirmPassword', {
                                    required: 'Please confirm your password',
                                    validate: (value) => value === password || 'The passwords do not match'
                                })}
                                className="w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2.5 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                placeholder="Re-enter your password"
                            />
                            {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Creating account...' : 'Create account'}
                        </Button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default Register;
