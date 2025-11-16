import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    // Navigate to landing page on login
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <img src="/assets/logo.png" alt="1000 Bananas Logo" className="w-12 h-12 object-contain" />
            <h1 className="text-3xl font-bold text-dark-text-primary">1000 BANANAS</h1>
          </div>
          <p className="text-dark-text-secondary text-sm">Welcome back! Please login to your account.</p>
        </div>

        {/* Login Card */}
        <div className="bg-dark-bg-secondary rounded-2xl shadow-2xl p-8 border border-dark-border-primary">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-text-primary mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-dark-bg-tertiary border border-dark-border-secondary rounded-lg text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-dark-accent-blue focus:border-transparent transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-text-primary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-dark-bg-tertiary border border-dark-border-secondary rounded-lg text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-dark-accent-blue focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 bg-dark-bg-tertiary border-dark-border-secondary rounded text-dark-accent-blue focus:ring-2 focus:ring-dark-accent-blue cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-dark-text-secondary cursor-pointer">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="text-sm text-dark-accent-blue hover:text-dark-accent-cyan transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-dark-accent-blue to-dark-accent-cyan text-white font-semibold py-3 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-dark-accent-blue focus:ring-offset-2 focus:ring-offset-dark-bg-secondary transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-dark-text-tertiary">
          <p>© 2024 1000 Bananas. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

