'use client';
import Link from 'next/link';
import { login, googleLogin } from './actions';
import { useState } from 'react';

export default function Login() {
  const [message, setMessage] = useState<{ error?: string } | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await login(formData);
    setMessage(result);
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    setMessage(null);
    
    try {
      const result = await googleLogin();
      if (result?.error) {
        setMessage({ error: result.error });
      }
    } catch (error) {
      console.error('Google login error:', error);
      setMessage({ error: 'Failed to initiate Google login' });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900 p-4">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white border border-pink-500 rounded-xl shadow-lg flex flex-col gap-4 sm:gap-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-pink-500 m-0">Log In</h1>
          <p className="text-sm sm:text-base text-zinc-600 m-0 mt-1">Welcome back to SmartSendr</p>
        </div>
        {message?.error && (
          <div className="bg-red-100 text-red-700 px-3 sm:px-4 py-2 rounded text-center text-xs sm:text-sm">{message.error}</div>
        )}
        
        <button 
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full h-10 inline-flex items-center justify-center px-3 sm:px-4 text-xs sm:text-sm font-medium text-white bg-pink-500 rounded-lg mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGoogleLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            'Log In with Google'
          )}
        </button>
        
        <div className="flex items-center my-2">
          <hr className="flex-1 border-t border-pink-500" />
          <span className="mx-3 sm:mx-4 text-xs sm:text-sm text-zinc-600">OR</span>
          <hr className="flex-1 border-t border-pink-500" />
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div>
            <label className="block mb-1 text-xs sm:text-sm font-medium text-pink-500" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              className="w-full px-3 py-2 text-sm sm:text-base border border-pink-500 rounded focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-xs sm:text-sm font-medium text-pink-500" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full px-3 py-2 text-sm sm:text-base border border-pink-500 rounded focus:outline-none"
              required
            />
          </div>
          <button type="submit" className="w-full h-10 text-xs sm:text-sm font-medium text-white bg-pink-500 rounded-lg">
            Log In
          </button>
        </form>
        <div className="text-center text-xs sm:text-sm text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-yellow-400 underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}