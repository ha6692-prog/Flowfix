import React, { useState, useEffect } from 'react';

export default function WorkerWallet() {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [demoClaimId, setDemoClaimId] = useState('');
    const [demoMode, setDemoMode] = useState(true);

    const fetchWallet = async () => {
        try {
            const res = await fetch('/api/payouts/wallet/');
            if (res.ok) {
                const data = await res.json();
                setWallet(data);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
        const interval = setInterval(() => {
            if (wallet?.recent_transactions?.some(t => t.status === 'PROCESSING' || t.status === 'INITIATED')) {
                fetchWallet();
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [wallet]);

    const fireDemoPayout = async () => {
        setDemoMode(true);
        if (!demoClaimId) return alert("Select a claim ID");
        await fetch('/api/payouts/demo/payout/fire/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim_id: demoClaimId })
        });
        setTimeout(fetchWallet, 1000);
    };

    if (loading) return <div className="p-8 text-white">Loading wallet...</div>;

    return (
        <div className="bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-6 max-w-2xl mx-auto h-[600px] flex flex-col">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                Worker Wallet
            </h2>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6 text-center">
                <span className="text-slate-400 uppercase text-xs font-bold tracking-wider">Current Balance</span>
                <div className="text-6xl font-extrabold mt-2 text-emerald-400">
                    ?{wallet?.balance || "0.00"}
                </div>
            </div>

            {demoMode && (
                <div className="bg-slate-800 border border-purple-500/30 p-4 rounded-lg mb-6 flex gap-4 items-center">
                    <input 
                        type="text" 
                        placeholder="Claim ID (e.g. 1)" 
                        value={demoClaimId} 
                        onChange={e => setDemoClaimId(e.target.value)}
                        className="bg-slate-900 border border-slate-700 px-3 py-2 rounded text-white flex-1"
                    />
                    <button onClick={fireDemoPayout} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded font-bold transition">
                        Live Payout Demo
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <h3 className="text-lg font-semibold text-slate-300">Recent Transactions</h3>
                {wallet?.recent_transactions?.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                        <div>
                            <div className="font-bold flex items-center gap-2">
                                <span className={\w-2 h-2 rounded-full \\}></span>
                                {tx.gateway} Payout
                            </div>
                            <div className="text-xs text-slate-400 mt-1 font-mono">
                                ID: {tx.gateway_reference_id || tx.id} | {new Date(tx.initiated_at).toLocaleTimeString()}
                            </div>
                            {tx.failure_reason && <div className="text-xs text-red-400 mt-1">{tx.failure_reason}</div>}
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-lg">?{tx.amount}</div>
                            <div className={\	ext-xs font-bold px-2 py-1 rounded-full inline-block mt-1 \\}>
                                {tx.status}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
