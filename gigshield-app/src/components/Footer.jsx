import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Utility for requestAnimationFrame counters
function AnimatedCounter({ endValue, duration = 2000, prefix = "", className = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    ScrollTrigger.create({
      trigger: ref.current,
      start: "top 90%",
      onEnter: () => {
        if (started.current) return;
        started.current = true;
        
        let startTimestamp = null;
        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          // easeOutExpo algorithm
          const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          setCount(Math.floor(easeOut * endValue));
          if (progress < 1) {
            window.requestAnimationFrame(step);
          }
        };
        window.requestAnimationFrame(step);
      }
    });
  }, [endValue, duration]);

  return <span ref={ref} className={className}>{prefix}{count.toLocaleString('en-IN')}</span>;
}

export default function Footer() {
  const barRef = useRef(null);

  useEffect(() => {
    ScrollTrigger.create({
      trigger: barRef.current,
      start: "top 90%",
      onEnter: () => {
        gsap.to(barRef.current, { width: '78%', duration: 1.4, ease: 'power2.out' });
      }
    });
  }, []);

  return (
    <footer id="fund-status" className="w-full bg-[--asphalt] border-t border-[--night-border] pt-[64px] pb-[32px] px-4 relative z-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div>
          <h2 className="font-[--font-display] text-[48px] text-[--mist] leading-tight">Fund Status.</h2>
          <p className="font-[--font-mono] text-[13px] text-[--mist-ghost] mt-2">Live • Updated 2 min ago</p>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px] my-[40px]">
          
          <div className="bg-[--night] rounded-[20px] border border-[--night-border] p-[24px_28px]">
            <p className="font-[--font-mono] text-[11px] text-[--mist-ghost] uppercase mb-[8px]">Total Paid To Drivers</p>
            <AnimatedCounter endValue={423000} prefix="₹" duration={2500} className="font-[--font-display] text-[48px] text-[--green] leading-none" />
          </div>

          <div className="bg-[--night] rounded-[20px] border border-[--night-border] p-[24px_28px]">
            <p className="font-[--font-mono] text-[11px] text-[--mist-ghost] uppercase mb-[8px]">Drivers Currently Covered</p>
            <AnimatedCounter endValue={1247} duration={2000} className="font-[--font-display] text-[48px] text-[--orange] leading-none" />
          </div>

          <div className="bg-[--night] rounded-[20px] border border-[--night-border] p-[24px_28px]">
            <p className="font-[--font-mono] text-[11px] text-[--mist-ghost] uppercase mb-[8px]">Chennai Pool Health</p>
            <div className="mb-2">
              <span className="font-[--font-display] text-[32px] text-[--mist] leading-none">78%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-[6px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-2">
              <div ref={barRef} className="h-full bg-[--green] w-[0%]" />
            </div>
            <p className="font-[--font-mono] text-[12px] text-[--mist-ghost]">
              ₹38,500 of ₹50,000 available
            </p>
          </div>

        </div>

        {/* 4-Col Link Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 my-[48px]">
          <div>
            <div className="flex items-center font-[--font-display] text-[18px] text-[--mist] mb-4">
              Flow<span className="inline-block w-[7px] h-[7px] rounded-full bg-[--orange] mx-[1px]" />Fix
            </div>
            <p className="font-[--font-mono] text-[13px] text-[--mist-ghost] max-w-[200px] leading-[1.6]">
              Income protection for the roads of India.
            </p>
          </div>
          
          <div>
            <h4 className="font-[--font-mono] text-[11px] text-[--mist] uppercase tracking-widest mb-4">Platform</h4>
            <ul className="space-y-3 font-[--font-mono] text-[13px]">
              <li><a href="#how-it-works" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">How it Works</a></li>
              <li><a href="#protection-plans" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">Plans & Pricing</a></li>
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">Claim Engine</a></li>
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">Driver Connect</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-[--font-mono] text-[11px] text-[--mist] uppercase tracking-widest mb-4">Company</h4>
            <ul className="space-y-3 font-[--font-mono] text-[13px]">
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">About</a></li>
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">Careers</a></li>
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">Press</a></li>
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-[--font-mono] text-[11px] text-[--mist] uppercase tracking-widest mb-4">Legal</h4>
            <ul className="space-y-3 font-[--font-mono] text-[13px]">
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-[--mist-ghost] hover:text-[--orange] transition-colors">IRDAI Disclosures</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[--night-border] pt-[24px] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-[--font-mono] text-[11px] text-[--mist-ghost] max-w-[600px]">
            © 2025 FlowFix. Not an insurer. Technology partner to IRDAI-licensed carriers.
          </p>

          <div className="inline-flex items-center gap-2 bg-[rgba(22,163,74,0.08)] border border-[rgba(22,163,74,0.3)] rounded-full px-[16px] py-[6px]">
            <div className="w-[8px] h-[8px] rounded-full bg-[#10b981]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
            <span className="font-[--font-mono] text-[11px] text-[#10b981]">FUND OPERATIONAL</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
