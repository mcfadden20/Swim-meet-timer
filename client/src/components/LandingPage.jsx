import { Link } from 'react-router-dom';
import { BarChart3, Smartphone, Cloud, Lock, Zap, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="w-full bg-gradient-to-b from-blue-900 via-blue-800 to-blue-950 text-white font-sans overflow-hidden">
      {/* Header Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm bg-blue-900/80 border-b border-blue-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black italic tracking-wider">SWIM TIMER</span>
          </div>
          <Link
            to="/"
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-blue-900 font-black hover:shadow-lg hover:shadow-cyan-400/50 transition-all"
          >
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl md:text-7xl font-black mb-6 italic tracking-wider leading-tight">
          Championship-Grade <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Swim Meet Timing</span>
        </h1>
        <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
          Real-time race timing synchronized with Meet Maestro. Built for modern swimming officials with cloud-backed precision and offline reliability.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-blue-900 font-black text-lg hover:shadow-2xl hover:shadow-cyan-400/50 transition-all transform hover:-translate-y-1"
          >
            Launch App →
          </Link>
          <a
            href="#features"
            className="px-8 py-4 rounded-xl border-2 border-cyan-400 text-cyan-300 font-black text-lg hover:bg-cyan-400/10 transition-all"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-5xl font-black text-center mb-16 italic tracking-wider">
          Engineered for <span className="text-cyan-300">Performance</span>
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-800/50 to-blue-700/30 border border-blue-600/50 hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-400/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-3 italic">Real-Time Sync</h3>
            <p className="text-blue-100 leading-relaxed">
              Keep every split, heat, and lane synchronized with Meet Maestro. Automatic event advancement eliminates manual errors.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-800/50 to-blue-700/30 border border-blue-600/50 hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-400/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-3 italic">Mobile First</h3>
            <p className="text-blue-100 leading-relaxed">
              Zero-scroll responsive interface optimized for deck use. Palm-sized controls with haptic feedback for one-handed operation.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-800/50 to-blue-700/30 border border-blue-600/50 hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-400/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6">
              <Cloud className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-3 italic">Cloud Backed</h3>
            <p className="text-blue-100 leading-relaxed">
              SQLite with cloud synchronization. Work offline, sync automatically when connected. No data loss, ever.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-800/50 to-blue-700/30 border border-blue-600/50 hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-400/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-3 italic">Secure DQ System</h3>
            <p className="text-blue-100 leading-relaxed">
              PIN-gated disqualification submissions with audit logging. Prevent accidental entries with two-tier verification.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-800/50 to-blue-700/30 border border-blue-600/50 hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-400/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-3 italic">Live Results</h3>
            <p className="text-blue-100 leading-relaxed">
              Real-time meet dashboard with race summaries, splits, and official records. Admin panel for quick sanity checks.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-800/50 to-blue-700/30 border border-blue-600/50 hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-400/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-3 italic">Multi-Role</h3>
            <p className="text-blue-100 leading-relaxed">
              Deck official, meet administrator, and results viewer roles. Granular access control with session persistence.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8 bg-blue-900/50 rounded-2xl">
        <div className="text-center">
          <div className="text-5xl font-black italic text-cyan-300 mb-2">0ms</div>
          <p className="text-blue-100">Timing Latency</p>
        </div>
        <div className="text-center">
          <div className="text-5xl font-black italic text-cyan-300 mb-2">∞</div>
          <p className="text-blue-100">Offline Reliability</p>
        </div>
        <div className="text-center">
          <div className="text-5xl font-black italic text-cyan-300 mb-2">1-Click</div>
          <p className="text-blue-100">Meet Setup</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border border-cyan-400/30 rounded-2xl p-12">
          <h2 className="text-4xl font-black mb-4 italic">Ready to Time Championships?</h2>
          <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
            Join thousands of competitive swimming programs trusting Swim Meet Timer for accuracy, reliability, and ease of use.
          </p>
          <Link
            to="/"
            className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-blue-900 font-black text-lg hover:shadow-2xl hover:shadow-cyan-400/50 transition-all transform hover:-translate-y-1"
          >
            Get Started Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-700/50 bg-blue-950/50 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-blue-300 text-sm">
          <p>© 2026 Swim Meet Timer. Built for competitive swimming excellence.</p>
        </div>
      </footer>
    </div>
  );
}
