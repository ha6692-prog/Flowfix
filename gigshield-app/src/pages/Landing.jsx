import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/Hero';
import IntelligenceGrid from '../components/IntelligenceGrid';
import HowItWorks from '../components/HowItWorks';
import Plans from '../components/Plans';
import Footer from '../components/Footer';

export default function Landing() {
  const location = useLocation()
  const [showPlanPrompt, setShowPlanPrompt] = useState(false)

  // Ensure background is correctly set if arriving from dashboard nav
  useEffect(() => {
    document.body.style.backgroundColor = 'var(--asphalt)';
  }, []);

  useEffect(() => {
    const fromSignup = !!location.state?.postSignupPlanPrompt
    const targetHash = location.hash === '#protection-plans'

    if (fromSignup || targetHash) {
      setShowPlanPrompt(true)
      const id = window.setTimeout(() => {
        const el = document.getElementById('protection-plans')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
      return () => window.clearTimeout(id)
    }
  }, [location.hash, location.state])

  return (
    <div className="relative w-full overflow-hidden text-[--mist]">
      {showPlanPrompt && (
        <div className="max-w-6xl mx-auto px-4 pt-24 pb-2">
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl px-5 py-4 text-cyan-200">
            <p className="text-sm font-semibold">Account ready. Activate a protection plan to start coverage.</p>
            <p className="text-xs text-cyan-100/80 mt-1">Pick a plan below and tap Activate Plan.</p>
          </div>
        </div>
      )}
      <Hero />
      <IntelligenceGrid />
      <HowItWorks />
      <Plans />
      <Footer />
    </div>
  );
}
