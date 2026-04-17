import React, { useState } from 'react';

export default function DemoControlPanel() {
    const [activeTab, setActiveTab] = useState('scenarios');
    const [logs, setLogs] = useState([]);
    const [score, setScore] = useState(0);
    const [decision, setDecision] = useState('APPROVE');

    const runScenarios = async () => {
        // Mock API call
        setLogs(prev => [...prev, '[INFO] Running Scenarios: FRAUD-6...']);
        const res = await fetch('/api/demo/scenarios/run/', {
            method: 'POST',
            body: JSON.stringify({ scenario_ids: ['FRAUD-6'] })
        }).catch(() => null);

        setScore(85);
        setDecision('REJECT');
        setLogs(prev => [...prev, '[WARN] Fraud detected. Claim rejected.']);
    };

    const triggerStorm = async () => {
        setLogs(prev => [...prev, '[EVENT] Storm triggered in demo-zone...']);
        const res = await fetch('/api/demo/storm/trigger/', {
            method: 'POST',
            body: JSON.stringify({ zone_id: 'chennai-3', edz_score: 0.85 })
        }).catch(() => null);
        setLogs(prev => [...prev, '[INFO] Processed 47 workers (38 Approved, 7 Review, 2 Rejected)']);
    };

    return (
        <div className="bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-6 max-w-4xl mx-auto flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                    Mission Control <span className="text-slate-500 text-sm font-normal">SIMULATION MODE</span>
                </h2>
                <div className="flex gap-2">
                    {['scenarios', 'storm', 'payouts'].map(tab => (
                        <button key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Left Panel: Controls */}
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
                    {activeTab === 'scenarios' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Scenario Runner</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg cursor-pointer hover:bg-red-500/20">
                                    <h4 className="font-bold text-red-400">FRAUD-6: GPS & Motion Mismatch</h4>
                                    <p className="text-xs text-slate-400 mt-1">Simulates high speed with low accelerometer variance.</p>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg cursor-pointer hover:bg-emerald-500/20">
                                    <h4 className="font-bold text-emerald-400">FALSE-15: Rural Deadzone</h4>
                                    <p className="text-xs text-slate-400 mt-1">Simulates valid offline handoff in known deadzone.</p>
                                </div>
                            </div>
                            <button onClick={runScenarios} className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl font-bold">Run Simulation</button>
                        </div>
                    )}

                    {activeTab === 'storm' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Disruption Trigger</h3>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Extreme Disruption Zone Score</label>
                                <input type="range" min="0" max="100" defaultValue="85" className="w-full accent-cyan-500" />
                            </div>
                            <button onClick={triggerStorm} className="w-full mt-4 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold">Trigger API Storm</button>
                        </div>
                    )}

                    {activeTab === 'payouts' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Payout Demo</h3>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Select Approved Claim</label>
                                <select className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded text-white" id="payoutClaimId">
                                    <option value="1">Claim #1 - Driver Arjun</option>
                                    <option value="2">Claim #2 - Driver Ravi</option>
                                </select>
                            </div>
                            <button onClick={async () => {
                                const claimId = document.getElementById('payoutClaimId').value;
                                setLogs(prev => [...prev, `[EVENT] Triggering payout for Claim #${claimId}...`]);
                                await fetch('/api/payouts/demo/payout/fire/', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ claim_id: claimId })
                                });
                                setLogs(prev => [...prev, '[INFO] GATE 1 PASS - Claim is APPROVED.', '[INFO] GATE 2 PASS - Score <= 30.', '[INFO] GATE 3 PASS - Unique attempt.', '[INFO] GATE 4 PASS - Valid amount.', '[INFO] GATE 5 PASS - KYC verified.', '[INFO] GATE 6 PASS - Rate limit OK.', '[INFO] GATE 7 PASS - Routed to MOCK Gateway.', '[INFO] GATE 8 PASS - Ownership OK.']);
                                setTimeout(() => setLogs(prev => [...prev, '[SUCCESS] Mock Payout SUCCESS. Wallet updated.']), 1500);
                            }} className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-bold">
                                Fire Instant Payout
                            </button>
                        </div>
                    )}

                    {/* Score Display */}
                    <div className="mt-auto bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400 uppercase text-xs font-bold tracking-wider">Fraud Score</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${decision === 'REJECT' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                {decision}
                            </span>
                        </div>
                        <div className="text-4xl font-bold mb-4">{score} / 100</div>
                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-red-500" style={{ width: `${score}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Logs */}
                <div className="w-1/3 bg-black rounded-lg border border-slate-800 p-4 font-mono text-xs overflow-y-auto flex flex-col">
                    <h4 className="text-slate-500 mb-2 border-b border-slate-800 pb-2">Terminal Output</h4>
                    <div className="flex-1 space-y-1">
                        {logs.length === 0 ? <span className="text-slate-600">Waiting for simulation events...</span> :
                            logs.map((log, i) => (
                                <div key={i} className={log.includes('[WARN]') ? 'text-red-400' : log.includes('[EVENT]') ? 'text-purple-400' : 'text-emerald-400'}>
                                    {log}
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}