import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks() {
  const containerRef = useRef(null);
  const headlineRef = useRef(null);

  useEffect(() => {
    if (!headlineRef.current) return;

    // Headline reveal animation
    const words = document.querySelectorAll('.hiw-word-inner');
    if (!words.length) return;

    gsap.fromTo(words, 
      { y: 80 }, 
      { 
        y: 0, 
        stagger: 0.08, 
        ease: 'power3.out',
        scrollTrigger: {
          trigger: headlineRef.current,
          start: 'top 80%',
        }
      }
    );

    // Stacking Cards ScrollTrigger logic
    const cards = gsap.utils.toArray('.sticky-card');
    
    // We bind a trigger to each card except the last
    cards.forEach((card, index) => {
      if (index === cards.length - 1) return; // Skip last card

      gsap.to(card, {
        scale: 0.94,
        opacity: 0.35,
        filter: 'blur(6px)',
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          start: 'top 128px', 
          end: () => `+=${card.offsetHeight + 24}`, // Overlap zone
          scrub: 1,
          pinSpacing: false
        }
      });
    });

  }, []);

  const headlineStr = "A claim fires while you're still on the road.";

  return (
    <section id="how-it-works" className="w-full max-w-5xl mx-auto px-4 py-24 relative z-10" ref={containerRef}>
      {/* Dynamic Word Headline */}
      <h2 
        ref={headlineRef}
        className="font-[--font-display] text-[48px] md:text-[72px] text-[--mist] leading-[1.1] max-w-[800px] mb-[64px]"
      >
        {headlineStr.split(' ').map((word, i) => (
          <span key={i} className="inline-block overflow-hidden mr-[0.3em] pb-2">
            <span className="hiw-word-inner inline-block">{word}</span>
          </span>
        ))}
      </h2>

      {/* Sticky Cards Container */}
      <div className="flex flex-col gap-0 relative">
        <StepCard1 />
        <StepCard2 />
        <StepCard3 />
        <StepCard4 />
      </div>
    </section>
  );
}

function BaseCard({ stepNum, headline, body, timeChip, visualContent, stepName }) {
  return (
    <div className="sticky-card sticky top-[128px] min-h-[400px] bg-[--night] rounded-[28px] border border-[--night-border] p-[32px] md:p-[56px_64px] mb-[24px] overflow-hidden flex flex-col justify-between shadow-2xl">
      
      {/* Background Number */}
      <div className="absolute bottom-[-20px] right-[48px] text-[180px] md:text-[220px] font-[--font-display] text-[rgba(255,255,255,0.025)] z-0 select-none pointer-events-none leading-none">
        {stepNum}
      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {/* Top chunk */}
        <div>
          <span className="font-[--font-mono] text-[11px] text-[--orange] uppercase tracking-[0.1em] mb-4 block block">
            STEP {stepNum}
          </span>
          <h3 className="font-[--font-display] text-[36px] md:text-[48px] text-[--mist] leading-[1.1] mb-6 max-w-[500px]">
            {headline}
          </h3>
          <p className="font-[--font-mono] text-[14px] md:text-[15px] text-[--mist-dim] max-w-[560px] leading-[1.7]">
            {body}
          </p>
        </div>

        {/* Bottom chunk */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mt-12 gap-8 w-full">
          {/* Visual Container */}
          <div className="w-full max-w-[400px]">
            {visualContent}
          </div>
          
          {/* Time Chip */}
          <div className="font-[--font-mono] text-[12px] text-[--mist-ghost] border border-[--night-border] px-[12px] py-[4px] rounded-full self-start md:self-end shrink-0">
            {timeChip}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Specific Steps ── */

function StepCard1() {
  const barRef = useRef(null);

  useEffect(() => {
    if (!barRef.current) return;

    ScrollTrigger.create({
      trigger: barRef.current,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(barRef.current, { width: '84%', duration: 1.2, ease: 'power2.out' });
      }
    });
  }, []);

  return (
    <BaseCard 
      stepNum="01"
      headline="Rain. Orders drop. Drivers go quiet."
      body="Our 5-signal engine reads weather, order volume, peer GPS activity, traffic, and your own app beacons. The weighted score crosses 0.78 — it fires automatically. You don't press anything."
      timeChip="T+0:00"
      visualContent={
        <div>
          <div className="flex justify-between font-[--font-mono] text-[11px] mb-2">
            <span className="text-[--mist-ghost]">EDZ SCORE</span>
            <span className="text-[--orange]">0.84 — BREACH</span>
          </div>
          <div className="w-full h-[6px] bg-[--night-deep] rounded-full overflow-hidden">
            <div ref={barRef} className="h-full bg-[--orange] w-[0%]" />
          </div>
        </div>
      }
    />
  );
}

function StepCard2() {
  const containerRef = useRef(null);
  const bar1Ref = useRef(null);
  const bar2Ref = useRef(null);
  const checkRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !bar1Ref.current || !bar2Ref.current || !checkRef.current) return;

    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(bar1Ref.current, { width: '100%', duration: 0.8, ease: 'power2.out' });
        gsap.to(bar2Ref.current, { width: '100%', duration: 0.8, delay: 0.1, ease: 'power2.out', onComplete: () => {
          gsap.to(checkRef.current, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
        }});
      }
    });
  }, []);

  return (
    <BaseCard 
      stepNum="02"
      headline="Parallel checks. 47 seconds."
      body="Two tasks run side by side — fraud scoring and intent verification. Device fingerprint, cluster detection, GPS sensor cross-check. If you were trying to work, you pass."
      timeChip="T+0:47"
      visualContent={
        <div ref={containerRef} className="space-y-4">
          <div>
            <div className="font-[--font-mono] text-[11px] text-[--mist-ghost] mb-2">FRAUD CHECK</div>
            <div className="w-full h-[6px] bg-[--night-deep] rounded-full overflow-hidden">
              <div ref={bar1Ref} className="h-full bg-[--amber] w-[0%]" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="font-[--font-mono] text-[11px] text-[--mist-ghost] mb-2">INTENT SCORE</div>
              <div className="w-full h-[6px] bg-[--night-deep] rounded-full overflow-hidden">
                <div ref={bar2Ref} className="h-full bg-[--green] w-[0%]" />
              </div>
            </div>
            {/* Checkmark */}
            <div ref={checkRef} className="text-[--green] opacity-0 scale-50 pt-[18px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>
      }
    />
  );
}

function StepCard3() {
  const notifRef = useRef(null);

  useEffect(() => {
    if (!notifRef.current) return;

    ScrollTrigger.create({
      trigger: notifRef.current,
      start: 'top 85%',
      onEnter: () => {
        gsap.to(notifRef.current, { x: 0, opacity: 1, duration: 0.5, delay: 0.3, ease: 'power3.out' });
      }
    });
  }, []);

  return (
    <BaseCard 
      stepNum="03"
      headline="₹50 lands first. The rest follows."
      body="An instant ₹50 signal payment hits your UPI in seconds. The system is working — you can feel it. The full payout follows in 2 hours, no bank queue, no forms."
      timeChip="T+1:20"
      visualContent={
        <div 
          ref={notifRef} 
          className="bg-[#1a1c20] border border-[--night-border] rounded-[16px] p-[14px_20px] flex items-center gap-4 opacity-0 translate-x-[40px]"
        >
          <div className="w-[20px] h-[20px] rounded-full bg-[--green] flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="font-[--font-mono] text-[13px] text-[--mist] font-semibold mb-0.5">
              ₹50 received from FlowFix Fund
            </p>
            <p className="font-[--font-mono] text-[11px] text-[--mist-ghost]">
              UPI · Just now
            </p>
          </div>
        </div>
      }
    />
  );
}

function StepCard4() {
  return (
    <BaseCard 
      stepNum="04"
      headline="Next Monday, your reserve grows."
      body="Every unclaimed week credits ₹8–₹16 to your reserve wallet based on how long you've stayed. More months = more coverage. Miss a week? You restart. Stay loyal? You build a cushion."
      timeChip="T+7 days"
      visualContent={
        <div className="mt-4">
          <div className="relative flex justify-between items-center px-2">
            {/* Track Line */}
            <div className="absolute left-6 right-6 top-[13px] h-[2px] bg-[#1a1c20] z-0" />
            
            {/* Nodes */}
            {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier, i) => (
              <div key={tier} className="relative z-10 flex flex-col items-center gap-2">
                <div className="relative">
                  {/* Pulse ring for active (Gold/index 2) */}
                  {i === 2 && (
                    <div className="absolute inset-[-4px] rounded-full border border-[--orange] opacity-50 animate-[pulse_2s_ease-in-out_infinite]" />
                  )}
                  {/* Circle */}
                  <div className={`w-[28px] h-[28px] rounded-full ${i === 2 ? 'bg-[--orange]' : 'bg-[#1a1c20]'}`} />
                </div>
                <span className={`font-[--font-mono] text-[10px] ${i === 2 ? 'text-[--mist]' : 'text-[--mist-ghost]'}`}>
                  {tier}
                </span>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
