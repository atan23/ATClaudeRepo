import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Sparkles, Target, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const authError = searchParams.get('error');

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.demoLogin();
      await login(res.data.token);
      navigate('/dashboard');
    } catch {
      setError('Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const features = [
    { icon: BookOpen, text: 'Track books across Kindle & Goodreads', color: 'text-blue-600 bg-blue-100' },
    { icon: Sparkles, text: 'Get personalized AI recommendations', color: 'text-purple-600 bg-purple-100' },
    { icon: Target, text: 'Set reading goals & earn badges', color: 'text-amber-600 bg-amber-100' },
    { icon: Users, text: 'Discover what readers are loving', color: 'text-green-600 bg-green-100' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-white text-8xl font-serif rotate-12 opacity-30"
              style={{ top: `${15 + i * 15}%`, left: `${5 + (i % 3) * 30}%` }}
            >
              📚
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="text-white" size={22} />
            </div>
            <span className="text-2xl font-bold text-white">ReadWise</span>
          </div>
          <p className="text-blue-200 text-sm">Your personal book companion</p>
        </div>

        <div className="relative space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Discover your next<br />
            <span className="text-amber-400">great read</span>
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Track your reading journey, get personalized recommendations, and achieve your reading goals.
          </p>

          <div className="grid grid-cols-1 gap-3 pt-2">
            {features.map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${color.split(' ')[1]} flex items-center justify-center`}>
                  <Icon size={16} className={color.split(' ')[0]} />
                </div>
                <span className="text-blue-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-400 text-xs relative">
          © 2024 ReadWise. Your reading, elevated.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="text-white" size={18} />
            </div>
            <span className="text-xl font-bold text-slate-800">ReadWise</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to continue your reading journey</p>

          {(error || authError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error || 'Authentication failed. Please try again.'}
            </div>
          )}

          <div className="space-y-3">
            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-blue-400 hover:bg-blue-50 transition-all duration-150"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Demo login */}
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-150 shadow-sm disabled:opacity-70"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" />Signing in...</>
              ) : (
                <><BookOpen size={18} />Try Demo (No sign-in needed)</>
              )}
            </button>
          </div>

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-medium mb-1">🎮 Demo account includes:</p>
            <ul className="text-xs text-amber-600 space-y-0.5">
              <li>• Pre-loaded reading history from Kindle & Goodreads</li>
              <li>• Active reading goals & earned badges</li>
              <li>• Personalized recommendations ready to explore</li>
            </ul>
          </div>

          <p className="mt-6 text-xs text-center text-slate-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
