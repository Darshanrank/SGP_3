// src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { resetPassword } from '../services/auth.service';
import { toast } from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await resetPassword(token, data.password);
      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (error) {
       toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
       <div className="page-shell">
           <div className="mx-auto w-full max-w-md">
             <section className="section-card text-center">
               <h1 className="text-3xl font-extrabold tracking-tight text-[#DCE7F5]">Password Updated</h1>
               <p className="mt-3 text-sm text-[#8DA0BF]">
                   Your password has been reset.
               </p>
               <Link to="/login" className="mt-4 inline-block font-medium text-[#7BB2FF] hover:text-[#9FC8FF]">
                   Login with new password
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
          <h1 className="text-3xl font-extrabold tracking-tight text-[#DCE7F5]">Set New Password</h1>
          <p className="mt-2 text-sm text-[#8DA0BF]">Create a strong password for your account.</p>
        </header>

        <section className="section-card">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#DCE7F5]">New Password</label>
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
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-[#0E1620] px-3 py-2.5 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                placeholder="Create a strong password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/,
                    message: 'Password must include uppercase, lowercase, number, and special character'
                  }
                })}
              />
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ResetPassword;
