// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { forgotPassword } from '../services/auth.service';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await forgotPassword(data.email);
      setSuccess(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
     return (
        <div className="page-shell">
            <div className="mx-auto w-full max-w-md">
              <section className="section-card text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#DCE7F5]">Check Your Email</h1>
                <p className="mt-3 text-sm text-[#8DA0BF]">
                    We have sent a password reset link to your email address.
                </p>
                <Link to="/login" className="mt-4 inline-block font-medium text-[#7BB2FF] hover:text-[#9FC8FF]">
                    Back to login
                </Link>
              </section>
            </div>
        </div>
     );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#DCE7F5]">Forgot Password?</h1>
          <p className="mt-2 text-sm text-[#8DA0BF]">
            Enter your email and we will send a secure reset link.
          </p>
        </header>

        <section className="section-card">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#DCE7F5]">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2.5 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div className="text-center">
              <Link to="/login" className="font-medium text-[#7BB2FF] hover:text-[#9FC8FF]">
                Back to login
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ForgotPassword;
