import React, { useEffect } from 'react';
import Hero from '../components/Hero';
import IntelligenceGrid from '../components/IntelligenceGrid';
import HowItWorks from '../components/HowItWorks';
import Plans from '../components/Plans';
import Footer from '../components/Footer';

export default function Landing() {
  // Ensure background is correctly set if arriving from dashboard nav
  useEffect(() => {
    document.body.style.backgroundColor = 'var(--asphalt)';
  }, []);

  return (
    <div className="relative w-full overflow-hidden text-[--mist]">
      <Hero />
      <IntelligenceGrid />
      <HowItWorks />
      <Plans />
      <Footer />
    </div>
  );
}
