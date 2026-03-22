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
       <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
           <div className="max-w-md w-full space-y-8 text-center">
               <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Success!</h2>
               <p className="mt-2 text-sm text-gray-600">
                   Your password has been reset.
               </p>
               <Link to="/login" className="mt-4 font-medium text-blue-600 hover:text-blue-500">
                   Login with new password
               </Link>
           </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Set new password</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="password" className="sr-only">New Password</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="New Password"
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/,
                  message: 'Password must include uppercase, lowercase, number, and special character'
                }
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-500"
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
             <Button type="submit" className="w-full flex justify-center" disabled={isSubmitting}>
               {isSubmitting ? 'Resetting...' : 'Reset Password'}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
