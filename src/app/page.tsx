import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-zinc-900 to-pink-800 p-4">
      <div className="w-full max-w-md p-6 sm:p-10 bg-zinc-800/80 rounded-3xl shadow-2xl flex flex-col items-center gap-6 sm:gap-8 border border-zinc-800">
        {/* Logo/Icon */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-pink-400/10 flex items-center justify-center mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500 sm:w-8 sm:h-8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 3h-8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/><path d="M8 10h.01"/><path d="M16 10h.01"/></svg>
          </div>
          <span className="text-3xl sm:text-4xl font-extrabold text-pink-500 tracking-tight text-center">SmartSendr</span>
          <p className="text-base sm:text-lg text-zinc-200 text-center font-medium">Personalized Cold Emails, Scaled.</p>
        </div>
        <div className="text-zinc-400 text-center text-sm sm:text-base max-w-xs space-y-4">
          <p>SmartSendr is your ultimate AI-powered email outreach platform.</p>
          <p>We help you:</p>
          <ul className="list-disc list-inside text-left mx-auto" style={{ maxWidth: 'fit-content' }}>
            <li>Create personalized cold emails with AI.</li>
            <li>Effortlessly manage your contacts.</li>
            <li>Automate your outreach process.</li>
            <li>Streamline communication and boost engagement.</li>
            <li>Add your Resume and Let the AI handle the rest</li>
          </ul>
          <p>Connect your Gmail, upload your contacts, and let our AI craft unique messages for each person.</p>
        </div>
        <div className="w-full space-y-3">
          <Link
            href="/dashboard"
            className="w-full inline-flex items-center justify-center h-11 sm:h-12 rounded-xl bg-pink-500 text-zinc-50 font-semibold text-base sm:text-lg shadow-md hover:bg-pink-600 transition-colors duration-200 no-underline"
          >
            Get Started
          </Link>
          <Link
            href="/pricing"
            className="w-full inline-flex items-center justify-center h-11 sm:h-12 rounded-xl bg-gray-500 text-zinc-50 font-semibold text-base sm:text-lg shadow-md hover:bg-gray-600 transition-colors duration-200 no-underline"
          >
            Pricing
          </Link>
        </div>
        <div className="text-xs text-zinc-400 mt-4 opacity-70 text-center">&copy; 2024 SmartSendr. All rights reserved.</div>
      </div>
    </div>
  );
}
