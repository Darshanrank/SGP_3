// src/pages/VerifyEmail.jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../services/auth.service';
import { CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { setAuthSession } = useAuth();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            try {
                const response = await verifyEmail(token);
                await setAuthSession({ accessToken: response.accessToken, user: response.user });
                setStatus('success');
                setMessage(response.message || 'Email verified successfully! Redirecting to profile setup...');

                setTimeout(() => {
                    navigate('/profile?setup=1', { replace: true });
                }, 1200);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || "Verification failed. Token might be invalid or expired.");
            }
        };

        if (token) verify();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center bg-white p-8 rounded-lg shadow-sm">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <h2 className="text-xl font-bold text-gray-900">Verifying Email...</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Verified!</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <Link to="/profile?setup=1" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                            Continue to Profile Setup
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <XCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <Link to="/login" className="text-blue-600 hover:underline">
                            Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
