import React, { useState, useRef } from 'react';

// ── Scenario definitions ─────────────────────────────────────────────────────
const SCENARIOS = {
  fraud: [
    {
      id: 'FRAUD-6',
      label: 'GPS & Motion Mismatch',
      description: 'High speed movement with near-zero accelerometer variance.',
      baseScore: 82,
      variance: 8,
      color: 'red',
      tags: ['GPS', 'Motion'],
    },
    {
      id: 'FRAUD-11',
      label: 'Multi-Device Login',
      description: 'Same driver account active on 3 devices simultaneously.',
      baseScore: 91,
      variance: 5,
      color: 'red',
      tags: ['Identity', 'Session'],
    },
    {
      id: 'FRAUD-3',
      label: 'Claim Without Beacon',
      description: 'Claim filed during period with zero activity beacon signals.',
      baseScore: 74,
      variance: 10,
      color: 'orange',
      tags: ['Beacon', 'Claim'],
    },
  ],
  valid: [
    {
      id: 'VALID-15',
      label: 'Rural Deadzone Handoff',
      description: 'Valid offline handoff in known GPS deadzone — false positive.',
      baseScore: 18,
      variance: 6,
      color: 'emerald',
      tags: ['GPS', 'Offline'],
    },
    {
      id: 'VALID-9',
      label: 'Night Shift Anomaly',
      description: 'Unusual hours but consistent with historical patterns.',
      baseScore: 28,
      variance: 8,
      color: 'emerald',
      tags: ['Behaviour', 'History'],
    },
  ],
};

const ALL_SCENARIOS = [...SCENARIOS.fraud, ...SCENARIOS.valid];

// ── Decision logic ────────────────────────────────────────────────────────────
function getDecision(score) {
  if (score >= 80) return { label: 'REJECT',  color: 'red',    bg: 'bg-red-500/20 text-red-400',    icon: '🚫' };
  if (score >= 60) return { label: 'HOLD',    color: 'orange', bg: 'bg-orange-500/20 text-orange-400', icon: '⏸️' };
  if (score >= 40) return { label: 'REVIEW',  color: 'yellow', bg: 'bg-yellow-500/20 text-yellow-400', icon: '🔍' };
  return              { label: 'APPROVE', color: 'green',  bg: 'bg-green-500/20 text-green-400',   icon: '✅' };
}

// ── Color map ─────────────────────────────────────────────────────────────────
const COLORS = {
  red:     'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
  orange:  'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20',
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20',
};

const SELECTED_COLORS = {
  red:     'bg-red-500/25 border-red-400 text-red-300 ring-1 ring-red-400/50',
  orange:  'bg-orange-500/25 border-orange-400 text-orange-300 ring-1 ring-orange-400/50',
  emerald: 'bg-emerald-500/25 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50',
};

// ── Timestamp helper ──────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('en-IN', { hour12: false });

// ── Log line component ────────────────────────────────────────────────────────
function LogLine({ text }) {
  const cls =
    text.includes('[WARN]') || text.includes('[FRAUD]') ? 'text-red-400' :
    text.includes('[EVENT]') || text.includes('[STORM]') ? 'text-purple-400' :
    text.includes('[FLOW]')  ? 'text-cyan-400' :
    text.includes('[HOLD]')  ? 'text-orange-400' :
    text.includes('[REVIEW]')? 'text-yellow-400' :
    text.includes('[OK]')    ? 'text-emerald-400' :
    'text-slate-400';
  return <div className={cls}>{text}</div>;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DemoControlPanel() {
  const [activeTab, setActiveTab]         = useState('scenarios');
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [logs, setLogs]                   = useState([]);
  const [score, setScore]                 = useState(0);
  const [running, setRunning]             = useState(false);
  const [edzValue, setEdzValue]           = useState(85);
  const [flowStep, setFlowStep]           = useState(0);  // 0=idle, 1-5=steps
  const logsEndRef = useRef(null);

  const decision = getDecision(score);

  const addLog = (line) => setLogs(prev => {
    const updated = [...prev, `[${ts()}] ${line}`];
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    return updated;
  });

  const toggleScenario = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Scenario Runner ─────────────────────────────────────────────────────────
  const runScenarios = async () => {
    if (selectedIds.size === 0) {
      addLog('[WARN] No scenarios selected. Pick at least one.');
      return;
    }
    setRunning(true);
    setScore(0);

    const selected = ALL_SCENARIOS.filter(s => selectedIds.has(s.id));
    addLog(`[INFO] Initialising simulation engine — ${selected.length} scenario(s) queued`);

    let compositeScore = 0;

    for (const scenario of selected) {
      addLog(`[INFO] Running ${scenario.id}: ${scenario.label}`);
      await delay(600);

      try {
        await fetch('/api/demo/scenarios/run/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario_ids: [scenario.id] }),
        });
      } catch (_) { /* backend optional in demo mode */ }

      const scenarioScore = clamp(
        scenario.baseScore + jitter(scenario.variance), 0, 100
      );
      compositeScore = Math.max(compositeScore, scenarioScore);

      const d = getDecision(scenarioScore);
      await delay(400);
      if (scenarioScore >= 80)
        addLog(`[FRAUD] ${scenario.id} — score ${scenarioScore} → ${d.icon} ${d.label}`);
      else if (scenarioScore >= 60)
        addLog(`[HOLD] ${scenario.id} — score ${scenarioScore} → ${d.icon} ${d.label}`);
      else if (scenarioScore >= 40)
        addLog(`[REVIEW] ${scenario.id} — score ${scenarioScore} → ${d.icon} ${d.label}`);
      else
        addLog(`[OK] ${scenario.id} — score ${scenarioScore} → ${d.icon} ${d.label}`);

      setScore(Math.round(compositeScore));
      await delay(300);
    }

    const finalDecision = getDecision(Math.round(compositeScore));
    await delay(400);
    addLog(`[INFO] ── Final composite score: ${Math.round(compositeScore)} / 100`);
    addLog(`[INFO] ── Decision: ${finalDecision.icon} ${finalDecision.label}`);
    setRunning(false);
  };

  // ── Storm Trigger ───────────────────────────────────────────────────────────
  const triggerStorm = async () => {
    setRunning(true);
    const edz = (edzValue / 100).toFixed(2);
    addLog(`[STORM] Triggering disruption in Chennai-Zone-3 — EDZ score: ${edz}`);
    await delay(500);

    try {
      await fetch('/api/demo/storm/trigger/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: 'chennai-3', edz_score: parseFloat(edz) }),
      });
    } catch (_) {}

    await delay(700);
    const total   = Math.floor(40 + Math.random() * 20);
    const approved = Math.floor(total * 0.75);
    const review  = Math.floor(total * 0.12);
    const rejected = total - approved - review;
    const paid    = (approved * 300).toLocaleString('en-IN');

    addLog(`[EVENT] EDZ engine processed ${total} active workers`);
    await delay(400);
    addLog(`[OK]    ${approved} claims auto-approved  →  ₹${paid} queued for payout`);
    addLog(`[REVIEW] ${review} claims sent for manual review`);
    addLog(`[WARN]  ${rejected} claims rejected — fraud signals detected`);
    await delay(300);
    addLog(`[INFO] Storm response complete. Pool debited.`);
    setRunning(false);
  };

  // ── Full Flow ────────────────────────────────────────────────────────────────
  const runFullFlow = async () => {
    setRunning(true);
    setFlowStep(0);

    const steps = [
      { step: 1, log: '[FLOW] Step 1/5 — Beacon received from driver ZMT-DRV-0003' },
      { step: 2, log: '[FLOW] Step 2/5 — EDZ engine evaluated zone score: 0.82 (DISRUPTION ACTIVE)' },
      { step: 3, log: '[FLOW] Step 3/5 — Claim auto-filed by system' },
      { step: 4, log: '[FLOW] Step 4/5 — Fraud check passed (score: 21 → APPROVE)' },
      { step: 5, log: '[FLOW] Step 5/5 — ✅ Payout of ₹300 queued via Razorpay' },
    ];

    for (const { step, log } of steps) {
      await delay(800);
      setFlowStep(step);
      addLog(log);
    }

    await delay(400);
    addLog('[OK] Full flow complete — 1 worker paid out successfully.');
    setRunning(false);
    setFlowStep(6); // done state
  };

  return (
    <div className="bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-6 max-w-4xl mx-auto flex flex-col h-[620px]">

      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${running ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></span>
          Mission Control
          <span className="text-slate-500 text-sm font-normal">
            {running ? 'RUNNING…' : 'SIMULATION MODE'}
          </span>
        </h2>
        <div className="flex gap-2">
          {['scenarios', 'storm', 'flow'].map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">

        {/* ── Left Panel ── */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">

          {/* SCENARIOS TAB */}
          {activeTab === 'scenarios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Scenario Runner</h3>
                <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
              </div>

              <p className="text-xs text-slate-500 uppercase tracking-wider">Fraud Signals</p>
              <div className="grid grid-cols-1 gap-2">
                {SCENARIOS.fraud.map(s => (
                  <ScenarioCard key={s.id} scenario={s} selected={selectedIds.has(s.id)} onToggle={toggleScenario} />
                ))}
              </div>

              <p className="text-xs text-slate-500 uppercase tracking-wider">Valid Edge Cases</p>
              <div className="grid grid-cols-1 gap-2">
                {SCENARIOS.valid.map(s => (
                  <ScenarioCard key={s.id} scenario={s} selected={selectedIds.has(s.id)} onToggle={toggleScenario} />
                ))}
              </div>

              <button
                onClick={runScenarios}
                disabled={running}
                className="w-full mt-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl font-bold transition"
              >
                {running ? 'Running…' : `Run ${selectedIds.size || 0} Scenario${selectedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* STORM TAB */}
          {activeTab === 'storm' && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold">Disruption Trigger</h3>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label className="text-slate-400">EDZ Score</label>
                  <span className={`font-bold ${edzValue >= 78 ? 'text-red-400' : edzValue >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(edzValue / 100).toFixed(2)}
                    {edzValue >= 78 ? ' ⚠️ Disruption Active' : edzValue >= 50 ? ' 🟡 Elevated' : ' ✅ Normal'}
                  </span>
                </div>
                <input
                  type="range" min="0" max="100"
                  value={edzValue}
                  onChange={e => setEdzValue(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>0.00 Normal</span><span>0.50 Elevated</span><span>0.78+ Disruption</span>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 text-sm space-y-1 border border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Estimated Impact</p>
                <div className="flex justify-between"><span className="text-slate-400">Zone</span><span className="text-white">Chennai-Zone-3</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Workers affected</span><span className="text-white">~{Math.floor(edzValue * 0.6)} drivers</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Est. payout</span><span className="text-emerald-400">₹{(Math.floor(edzValue * 0.6 * 0.75) * 300).toLocaleString('en-IN')}</span></div>
              </div>

              <button
                onClick={triggerStorm}
                disabled={running}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl font-bold transition"
              >
                {running ? 'Processing…' : 'Trigger Disruption'}
              </button>
            </div>
          )}

          {/* FLOW TAB */}
          {activeTab === 'flow' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">End-to-End Flow</h3>
              <p className="text-slate-400 text-sm">Simulates the full driver claim lifecycle from beacon ping to payout.</p>

              <div className="space-y-2">
                {[
                  { n: 1, label: 'Beacon received',       icon: '📡' },
                  { n: 2, label: 'EDZ score evaluated',   icon: '🌩️' },
                  { n: 3, label: 'Claim auto-filed',       icon: '📋' },
                  { n: 4, label: 'Fraud check executed',  icon: '🛡️' },
                  { n: 5, label: 'Payout queued',         icon: '💸' },
                ].map(({ n, label, icon }) => (
                  <div key={n} className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 ${
                    flowStep > n ? 'bg-emerald-500/10 border-emerald-500/30' :
                    flowStep === n ? 'bg-cyan-500/10 border-cyan-500/30 animate-pulse' :
                    'bg-slate-800 border-slate-700 opacity-50'
                  }`}>
                    <span className="text-lg">{flowStep > n ? '✅' : icon}</span>
                    <span className={`text-sm font-medium ${flowStep > n ? 'text-emerald-400' : flowStep === n ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {n}. {label}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={runFullFlow}
                disabled={running}
                className="w-full mt-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl font-bold transition"
              >
                {running ? 'Executing…' : flowStep === 6 ? 'Run Again' : 'Run Full Flow'}
              </button>
            </div>
          )}

          {/* ── Score Display (always visible) ── */}
          <div className="mt-auto bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 uppercase text-xs font-bold tracking-wider">Fraud Score</span>
              <div className="flex gap-2">
                {['APPROVE','REVIEW','HOLD','REJECT'].map(d => (
                  <span key={d} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                    decision.label === d
                      ? (d === 'APPROVE' ? 'bg-green-500/30 text-green-300 border-green-500/50' :
                         d === 'REVIEW'  ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50' :
                         d === 'HOLD'    ? 'bg-orange-500/30 text-orange-300 border-orange-500/50' :
                                           'bg-red-500/30 text-red-300 border-red-500/50')
                      : 'bg-transparent text-slate-600 border-slate-700'
                  }`}>{d}</span>
                ))}
              </div>
            </div>
            <div className="text-4xl font-bold mb-3 tabular-nums">{score} <span className="text-slate-600 text-xl">/ 100</span></div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-700"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Right Panel: Terminal ── */}
        <div className="w-80 bg-black rounded-lg border border-slate-800 p-4 font-mono text-xs flex flex-col">
          <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2">
            <h4 className="text-slate-500">Terminal Output</h4>
            <button onClick={() => setLogs([])} className="text-slate-700 hover:text-slate-400 transition text-[10px]">
              clear
            </button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto">
            {logs.length === 0
              ? <span className="text-slate-700">Waiting for simulation events…</span>
              : logs.map((log, i) => <LogLine key={i} text={log} />)
            }
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Scenario Card sub-component ───────────────────────────────────────────────
function ScenarioCard({ scenario, selected, onToggle }) {
  const base = COLORS[scenario.color] || COLORS.red;
  const sel  = SELECTED_COLORS[scenario.color] || SELECTED_COLORS.red;
  return (
    <div
      onClick={() => onToggle(scenario.id)}
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-150 ${selected ? sel : base}`}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm">{scenario.id}: {scenario.label}</h4>
        <div className="flex gap-1">
          {scenario.tags.map(t => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 opacity-70">{t}</span>
          ))}
          {selected && <span className="text-[10px] ml-1 opacity-80">✓</span>}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-0.5">{scenario.description}</p>
      <p className="text-[10px] opacity-50 mt-1">Base score: ~{scenario.baseScore} ± {scenario.variance}</p>
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────
const delay  = ms => new Promise(r => setTimeout(r, ms));
const jitter = n  => Math.floor((Math.random() * 2 - 1) * n);
const clamp  = (v, min, max) => Math.min(max, Math.max(min, v));
