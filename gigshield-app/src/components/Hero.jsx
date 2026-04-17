import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';

export default function Hero() {
  const [driverCount, setDriverCount] = useState(3241);
  const headlineRef = useRef();
  const subRef = useRef();

  // Increment driver count
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverCount(prev => prev + 1);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Format with comma
  const formattedCount = driverCount.toLocaleString('en-IN');

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Headline lines
      gsap.fromTo('.hero-line-inner', 
        { y: '100%', opacity: 0 },
        { y: '0%', opacity: 1, duration: 1.2, stagger: 0.15, ease: 'power4.out', delay: 0.1 }
      );
      
      // Sub-headline
      gsap.fromTo(subRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.5 }
      );

      // Buttons
      gsap.fromTo('.hero-btn',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.7 }
      );
    }, headlineRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden flex flex-col items-center pt-[140px] px-4" ref={headlineRef}>
      {/* ── Background Stack ── */}
      {/* Layer 0: base is in app-wrapper */}
      
      {/* Layer 1: Rain streak pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-100 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='0' x2='0' y2='100%25' stroke='rgba(255,255,255,0.015)' stroke-width='0.5' /%3E%3C/svg%3E")`,
          backgroundSize: '40px 100%',
          transform: 'skewX(-2deg)',
          transformOrigin: 'top'
        }}
      />

      {/* Layer 2: Radial gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-1"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(249,115,22,0.07) 0%, transparent 70%)' }}
      />

      {/* Layer 3: Bottom fade */}
      <div 
        className="absolute bottom-0 inset-x-0 h-[40vh] pointer-events-none z-2"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--asphalt) 100%)' }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-[900px] flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-[10px] bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.35)] rounded-full py-2 px-5 mb-8">
          <div className="w-2 h-2 rounded-full bg-[--orange]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
          <span className="font-[--font-mono] text-[12px] text-[--orange] tracking-wider uppercase">
            Protection Active — {formattedCount} Drivers Covered
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-[--font-display] text-5xl md:text-[96px] leading-[1.05] tracking-tight">
          <div className="overflow-hidden">
            <div className="hero-line-inner text-[--mist]">When the unexpected</div>
          </div>
          <div className="overflow-hidden">
            <div className="hero-line-inner text-[--mist]">stops your income,</div>
          </div>
          <div className="overflow-hidden">
            <div className="hero-line-inner text-[--orange] italic">we don't.</div>
          </div>
        </h1>

        {/* Sub-headline */}
        <p 
          ref={subRef}
          className="font-[--font-mono] text-[15px] md:text-[16px] text-[--mist-dim] leading-[1.7] max-w-[520px] mt-[28px] opacity-0"
        >
          Parametric income protection for Swiggy & Zomato delivery partners. 
          No claim forms. No waiting. Automatic.
        </p>

        {/* CTA Row */}
        <div className="flex flex-col sm:flex-row items-center gap-[16px] mt-[40px]">
          <Link 
            to="/login"
            className="hero-btn w-full sm:w-auto bg-[--orange] text-[--asphalt] font-[--font-mono] font-semibold text-[15px] rounded-full py-[16px] px-[40px] shadow-[0_8px_32px_rgba(249,115,22,0.3)] transition-all duration-300 hover:scale-[1.02] hover:brightness-110 opacity-0"
          >
            Get Protected
          </Link>
          <a 
            href="#how-it-works"
            className="hero-btn w-full sm:w-auto bg-transparent border border-[rgba(229,231,235,0.2)] text-[--mist] font-[--font-mono] text-[15px] rounded-full py-[16px] px-[40px] transition-all duration-300 hover:border-[rgba(249,115,22,0.5)] hover:text-[--orange] opacity-0"
          >
            See how it works
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 flex flex-col items-center z-10 animate-bounce-css">
        <div className="w-[1px] h-[32px] bg-[rgba(249,115,22,0.4)] mb-2" />
        <svg fill="none" stroke="rgba(249,115,22,0.5)" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
