import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

// "Continue with Google" for sign-in and sign-up. Renders nothing until
// REACT_APP_GOOGLE_CLIENT_ID is set. `role` applies only to brand-new accounts.
const GoogleAuthButton = ({ role = 'customer', text = 'continue_with' }) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  if (!GOOGLE_CLIENT_ID) return null;

  const handleSuccess = async ({ credential }) => {
    const result = await loginWithGoogle(credential, role);
    if (!result.success) return;
    navigate(result.user?.role === 'owner' ? '/dashboard' : '/bikes', { replace: true });
  };

  return (
    <div>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-xs uppercase tracking-widest text-neutral-500">or</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => toast.error('Google sign-in was cancelled or failed')}
          text={text}
          theme="filled_black"
          shape="pill"
          size="large"
          width="320"
        />
      </div>
    </div>
  );
};

export default GoogleAuthButton;
