'use client';
import Link from 'next/link';
import { signup, googleSignup } from './actions';
import { useState } from 'react';

export default function Signup() {
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await signup(formData);
    setMessage(result);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900">
      <div className="w-full max-w-md p-8 bg-white border border-pink-500 rounded-xl shadow-lg flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-pink-500 m-0">Sign Up</h1>
          <p className="text-zinc-600 m-0">Create your SmartSendr account</p>
        </div>
        {message?.error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded text-center text-sm">{message.error}</div>
        )}
        {message?.success && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded text-center text-sm">{message.success}</div>
        )}
        <form action={googleSignup} className="mb-2">
          <button type="submit" className="w-full h-10 inline-flex items-center justify-center px-4 text-sm font-medium text-white bg-pink-500 rounded-lg mb-2">
            Sign Up with Google
          </button>
        </form>
        <div className="flex items-center my-2">
          <hr className="flex-1 border-t border-pink-500" />
          <span className="mx-4 text-zinc-600">OR</span>
          <hr className="flex-1 border-t border-pink-500" />
        </div>
        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          <div>
            <label className="block mb-1 text-sm font-medium text-pink-500" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              className="w-full px-3 py-2 border border-pink-500 rounded focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-pink-500" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full px-3 py-2 border border-pink-500 rounded focus:outline-none"
              required
            />
          </div>
          <button type="submit" className="w-full h-10 text-sm font-medium text-white bg-pink-500 rounded-lg">
            Sign Up
          </button>
        </form>
        <div className="text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-yellow-400 underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
} 