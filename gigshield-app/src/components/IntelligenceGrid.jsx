import React, { useEffect, useState, useRef } from 'react';
import { analyticsApi, formatINR } from '../api/client';

export default function IntelligenceGrid() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-24 relative z-10">
      {/* Heading */}
      <div className="mb-16">
        <h2 className="font-[--font-display] text-5xl md:text-[72px] text-[--mist] leading-tight mb-4">
          How FlowFix thinks.
        </h2>
        <p className="font-[--font-mono] text-[15px] text-[--mist-dim]">
          Five live signals. One decision. Under 60 seconds.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[20px]">
        <EngineCard />
        <TerminalCard />
        <HeatmapCard />
      </div>
    </section>
  );
}

/* ── CARD 1: 5-Signal Engine ── */
function EngineCard() {
  const deck = [
    { label: "Weather", score: "0.82" },
    { label: "Orders", score: "0.71" },
    { label: "Peers", score: "0.68" },
    { label: "GPS", score: "0.74" },
    { label: "Traffic", score: "0.55" },
  ];

  return (
    <div className="group bg-[--night] rounded-[24px] border border-[--night-border] h-[460px] p-[28px] overflow-hidden relative flex flex-col justify-between">
      <div>
        <h4 className="font-[--font-mono] text-[12px] text-[--mist-dim] uppercase tracking-[0.08em] mb-2">
          5-Signal Detection Engine
        </h4>
        <h3 className="font-[--font-display] text-[28px] text-[--mist]">
          Reads the city.
        </h3>
      </div>

      {/* Deck container */}
      <div className="relative h-[200px] w-full mt-4" style={{ perspective: '1000px' }}>
        {deck.map((card, i) => {
          const defaultY = i * 8;
          return (
            <div 
              key={card.label}
              className="deck-card absolute left-[7.5%] w-[85%] bg-[#1a1c20] rounded-[14px] border border-[rgba(255,255,255,0.07)] p-3 px-4 flex justify-between items-center z-10 transition-all duration-500 ease-out"
              style={{
                transform: `translateY(${defaultY}px) translateZ(0px)`,
              }}
            >
              <span className="font-[--font-mono] text-[11px] text-[--mist-dim]">{card.label}</span>
              <span className="font-[--font-mono] text-[20px] text-[--orange]">{card.score}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom Display */}
      <div className="mt-auto">
        <p className="font-[--font-mono] text-[11px] text-[--mist-ghost] mb-1">EDZ SCORE</p>
        <div className="flex items-center gap-4">
          <span className="font-[--font-display] text-[52px] text-[--orange] leading-none">0.84</span>
          <span className="bg-[rgba(249,115,22,0.12)] border border-[rgba(249,115,22,0.4)] text-[--orange] font-[--font-mono] text-[10px] rounded-full px-3 py-1 animate-blink">
            THRESHOLD BREACHED
          </span>
        </div>
      </div>

      <style>{`
        .group:hover .deck-card:nth-child(1) { transform: translateX(-30px) translateY(-16px) rotate(-5deg); z-index: 10; }
        .group:hover .deck-card:nth-child(2) { transform: translateX(-14px) translateY(-6px) rotate(-2deg); z-index: 15; }
        .group:hover .deck-card:nth-child(3) { transform: translateY(0px) scale(1.04); z-index: 50; }
        .group:hover .deck-card:nth-child(4) { transform: translateX(14px) translateY(-6px) rotate(2deg); z-index: 15; }
        .group:hover .deck-card:nth-child(5) { transform: translateX(30px) translateY(-16px) rotate(5deg); z-index: 10; }
      `}</style>
    </div>
  );
}

/* ── CARD 2: Live Payout Terminal ── */
const MOCK_EVENTS = [
  "> ₹200 paid → Ravi K, Zone 3, Chennai        [12:41:03]",
  "> ₹200 paid → Meena S, Zone 1, Bengaluru     [12:41:07]",
  "> CLAIM FIRED → Zone 4 (flood, EDZ 0.91)     [12:41:09]",
  "> ₹200 paid → Arjun T, Zone 4, Chennai       [12:41:11]",
  "> WALLET CREDITED → 847 drivers +₹8 each     [12:41:22]",
  "> ₹200 paid → Divya R, Zone 2, Chennai       [12:41:28]"
];

function TerminalCard() {
  const [lines, setLines] = useState([MOCK_EVENTS[0]]);
  const [stats, setStats] = useState({ total_paid: 0, total_drivers: 0 });
  const eventIndex = useRef(1);

  useEffect(() => {
    // Fetch live platform stats
    analyticsApi.publicStats().then(r => setStats(r.data)).catch(() => {});

    const timer = setInterval(() => {
      setLines(prev => {
        const nextLine = MOCK_EVENTS[eventIndex.current];
        eventIndex.current = (eventIndex.current + 1) % MOCK_EVENTS.length;
        const newArray = [...prev, nextLine];
        return newArray.length > 7 ? newArray.slice(newArray.length - 7) : newArray;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[--night] rounded-[24px] border border-[--night-border] h-[460px] p-[28px] overflow-hidden flex flex-col justify-between">
      <div>
        <h4 className="font-[--font-mono] text-[12px] text-[--mist-dim] uppercase tracking-[0.08em] mb-2">
          Real-time payout feed
        </h4>
        <h3 className="font-[--font-display] text-[28px] text-[--mist]">
          Live, always.
        </h3>
      </div>

      {/* Terminal Box */}
      <div className="bg-[--night-deep] rounded-[14px] border border-[rgba(255,255,255,0.06)] h-[240px] p-[16px] overflow-hidden flex flex-col justify-end mt-4">
        {lines.map((text, i) => {
          let color = '--mist-dim';
          if (text.includes("CLAIM FIRED")) color = '--orange';
          if (text.includes("WALLET CREDITED")) color = '--green';

          return (
            <div 
              key={i + text}
              className="font-[--font-mono] text-[11.5px] leading-[1.6] animate-slide-up"
              style={{ color: `var(${color})` }}
            >
              {text}
            </div>
          );
        })}
        <div className="font-[--font-mono] text-[11.5px] text-[--orange] animate-blink leading-none mt-1">_</div>
      </div>

      {/* Counters */}
      <div className="flex gap-6 mt-auto">
        <div>
          <p className="font-[--font-mono] text-[10px] text-[--mist-ghost] mb-1 uppercase tracking-widest">Total Paid</p>
          <span className="font-[--font-display] text-[28px] text-[--green] leading-none">
            {stats.total_paid_out ? formatINR(stats.total_paid_out) : '₹—'}
          </span>
        </div>
        <div>
          <p className="font-[--font-mono] text-[10px] text-[--mist-ghost] mb-1 uppercase tracking-widest">Drivers</p>
          <span className="font-[--font-display] text-[28px] text-[--orange] leading-none">
            {stats.total_drivers ? stats.total_drivers.toLocaleString() : '—'}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUpFade 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

/* ── CARD 3: Zone Heat Map ── */
const ZONES = [
  { id: 1, name: "Thiruvanmiyur", risk: "0.21", drivers: 142 },
  { id: 2, name: "Adyar", risk: "0.34", drivers: 211 },
  { id: 3, name: "Velachery", risk: "0.55", drivers: 384 },
  { id: 4, name: "T. Nagar", risk: "0.76", drivers: 412, highlight: true },
  { id: 5, name: "Mount Road", risk: "0.61", drivers: 290 },
  { id: 6, name: "OMR", risk: "0.15", drivers: 530 },
  { id: 7, name: "Guindy", risk: "0.45", drivers: 177 },
  { id: 8, name: "Tambaram", risk: "0.22", drivers: 110 },
  { id: 9, name: "Mylapore", risk: "0.31", drivers: 105 },
  { id: 10, name: "Nungambakkam", risk: "0.41", drivers: 198 },
  { id: 11, name: "Marina", risk: "0.68", drivers: 84 },
  { id: 12, name: "Anna Nagar", risk: "0.29", drivers: 312 },
];

function HeatmapCard() {
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const [hoveredZone, setHoveredZone] = useState(null);

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;

    const handleMove = (e) => {
      const rect = card.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      glow.style.background = `radial-gradient(circle at ${mx}px ${my}px, rgba(249,115,22,0.18) 0%, transparent 45%)`;
    };

    const handleEnter = () => { glow.style.opacity = '1'; };
    const handleLeave = () => { glow.style.opacity = '0'; };

    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseenter', handleEnter);
    card.addEventListener('mouseleave', handleLeave);

    return () => {
      card.removeEventListener('mousemove', handleMove);
      card.removeEventListener('mouseenter', handleEnter);
      card.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <div 
      ref={cardRef} 
      className="bg-[--night] rounded-[24px] border border-[--night-border] h-[460px] p-[28px] overflow-hidden relative flex flex-col cursor-crosshair"
    >
      <div 
        ref={glowRef} 
        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300" 
        style={{ borderRadius: 'inherit', zIndex: 1 }}
      />
      
      <div className="relative z-10 pointers-events-none">
        <h4 className="font-[--font-mono] text-[12px] text-[--mist-dim] uppercase tracking-[0.08em] mb-2 pointer-events-none">
          Disruption Intelligence
        </h4>
        <h3 className="font-[--font-display] text-[28px] text-[--mist] pointer-events-none">
          See the city's risk.
        </h3>
      </div>

      {/* Hex Grid Approximation */}
      <div className="grid grid-cols-3 gap-2 mt-auto relative z-10 pb-[20px]">
        {ZONES.map((zone) => (
          <div
            key={zone.id}
            onMouseEnter={() => setHoveredZone(zone)}
            onMouseLeave={() => setHoveredZone(null)}
            className={`h-16 w-full rounded-md border transition-all duration-200 polygon-hex flex items-center justify-center
              ${zone.highlight 
                ? 'bg-[rgba(249,115,22,0.12)] border-[rgba(249,115,22,0.4)]' 
                : 'bg-[#1a1c20] border-[rgba(255,255,255,0.07)] hover:bg-[rgba(249,115,22,0.12)] hover:border-[rgba(249,115,22,0.4)]'}
            `}
          >
            <span className="text-[10px] font-[--font-mono] text-[--mist-ghost] select-none block">Z{zone.id}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredZone && (
        <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 w-[80%] bg-[--night] border border-[--night-border] rounded-xl p-[12px] z-20 pointer-events-none shadow-xl">
          <p className="font-[--font-mono] text-[11px] text-[--mist]">
            Zone {hoveredZone.id} · {hoveredZone.name} · Risk {hoveredZone.risk} · {hoveredZone.drivers} drivers active
          </p>
        </div>
      )}

      {/* Fallback hexagon CSS via clip path */}
      <style>{`
        .polygon-hex { clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); }
      `}</style>
    </div>
  );
}
