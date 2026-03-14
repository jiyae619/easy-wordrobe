import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shirt, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'reset';

const Login: React.FC = () => {
    const { isAuthenticated, isLoading, error, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, clearError } = useAuth();
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // Already logged in → go to home
    if (isAuthenticated && !isLoading) {
        return <Navigate to="/" replace />;
    }

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        clearError();
        setResetSent(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        clearError();

        try {
            if (mode === 'signin') {
                await signInWithEmail(email, password);
            } else if (mode === 'signup') {
                await signUpWithEmail(email, password, displayName);
            } else if (mode === 'reset') {
                await resetPassword(email);
                setResetSent(true);
            }
        } catch {
            // Error is set in AuthContext
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsSubmitting(true);
        clearError();
        try {
            await signInWithGoogle();
        } catch {
            // Error is set in AuthContext
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex justify-center font-sans">
            <div className="w-full max-w-[480px] min-h-screen flex flex-col relative">
                {/* Top decorative gradient */}
                <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-olive-200/50 to-transparent pointer-events-none" />

                <div className="flex-grow flex flex-col justify-center px-6 py-12 relative z-10">
                    {/* Logo & Title */}
                    <div className="text-center mb-10 animate-fade-in-up">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary mb-4 shadow-lg">
                            <Shirt className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-primary">Wardrobe AI</h1>
                        <p className="text-sm text-gray-400 mt-1">Your AI-powered personal stylist</p>
                    </div>

                    {/* Title for current mode */}
                    <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <h2 className="text-xl font-semibold text-primary">
                            {mode === 'signin' && 'Welcome back'}
                            {mode === 'signup' && 'Create account'}
                            {mode === 'reset' && 'Reset password'}
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {mode === 'signin' && 'Sign in to access your wardrobe'}
                            {mode === 'signup' && 'Start organizing your closet'}
                            {mode === 'reset' && 'We\'ll send you a reset link'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 animate-scale-in">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Reset Success */}
                    {resetSent && (
                        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 animate-scale-in">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-green-600">Password reset email sent! Check your inbox.</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3.5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        {/* Name field (signup only) */}
                        {mode === 'signup' && (
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                                <input
                                    id="displayName"
                                    type="text"
                                    placeholder="Full name"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-olive-200 rounded-xl text-sm text-primary placeholder:text-gray-300 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                            <input
                                id="email"
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full pl-11 pr-4 py-3.5 bg-white border border-olive-200 rounded-xl text-sm text-primary placeholder:text-gray-300 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                            />
                        </div>

                        {/* Password (not for reset) */}
                        {mode !== 'reset' && (
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full pl-11 pr-11 py-3.5 bg-white border border-olive-200 rounded-xl text-sm text-primary placeholder:text-gray-300 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        )}

                        {/* Forgot password link */}
                        {mode === 'signin' && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => switchMode('reset')}
                                    className="text-xs text-secondary hover:text-primary font-medium transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-olive-900 focus:ring-2 focus:ring-secondary/30 focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    {mode === 'signin' && 'Sign in'}
                                    {mode === 'signup' && 'Create account'}
                                    {mode === 'reset' && 'Send reset link'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    {mode !== 'reset' && (
                        <div className="flex items-center gap-3 my-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <div className="flex-grow h-px bg-olive-200" />
                            <span className="text-xs text-gray-400 font-medium">or</span>
                            <div className="flex-grow h-px bg-olive-200" />
                        </div>
                    )}

                    {/* Google Sign-In */}
                    {mode !== 'reset' && (
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-white border border-olive-200 rounded-xl font-medium text-sm text-primary hover:bg-olive-50 focus:ring-2 focus:ring-secondary/20 focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm animate-fade-in-up"
                            style={{ animationDelay: '350ms' }}
                        >
                            {/* Google Logo SVG */}
                            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" aria-hidden="true">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    )}

                    {/* Mode Switch */}
                    <div className="text-center mt-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        {mode === 'signin' && (
                            <p className="text-sm text-gray-400">
                                Don't have an account?{' '}
                                <button onClick={() => switchMode('signup')} className="text-secondary font-semibold hover:text-primary transition-colors">
                                    Sign up
                                </button>
                            </p>
                        )}
                        {mode === 'signup' && (
                            <p className="text-sm text-gray-400">
                                Already have an account?{' '}
                                <button onClick={() => switchMode('signin')} className="text-secondary font-semibold hover:text-primary transition-colors">
                                    Sign in
                                </button>
                            </p>
                        )}
                        {mode === 'reset' && (
                            <p className="text-sm text-gray-400">
                                Remember your password?{' '}
                                <button onClick={() => switchMode('signin')} className="text-secondary font-semibold hover:text-primary transition-colors">
                                    Back to sign in
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Bottom branding */}
                <div className="text-center py-4 text-xs text-gray-300">
                    Powered by AI · Made with ♥
                </div>
            </div>
        </div>
    );
};

export default Login;
