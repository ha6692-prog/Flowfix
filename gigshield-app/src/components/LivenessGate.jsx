import { useRef, useState, useEffect } from 'react';

const CHALLENGES = ['BLINK', 'SMILE', 'TURN_LEFT'];

export default function LivenessGate({ onSuccess }) {
    const videoRef = useRef(null);
    const [challenge, setChallenge] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | waiting | verifying | success | failed

    useEffect(() => {
        setChallenge(CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setStatus('waiting');
            }
        } catch (err) {
            console.error(err);
            setStatus('idle'); // fail graceful
        }
    };

    const captureAndVerify = async () => {
        setStatus('verifying');
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

        try {
            const res = await fetch('/api/identity/liveness-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challenge, image: imageData }),
            });
            const data = await res.json();
            if (data.passed) {
                setStatus('success');
                if (onSuccess) onSuccess();
            } else {
                setStatus('failed');
            }
        } catch (e) {
            setStatus('failed');
        }
    };

    return (
        <div className="bg-slate-900 rounded-xl p-6 text-center shadow-2xl shadow-cyan-900/20 max-w-sm mx-auto border border-white/5">
            <h2 className="text-xl font-bold text-white mb-2">Verification</h2>
            <p className="text-slate-400 text-sm mb-6">
                Security check required. Please <strong className="text-cyan-400 uppercase">{challenge?.replace('_', ' ')}</strong>.
            </p>

            <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-6 flex items-center justify-center border border-white/10">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform scale-x-[-1]"
                />
                {status === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button onClick={startCamera} className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2 rounded-full font-bold transition">
                            Start Camera
                        </button>
                    </div>
                )}
            </div>

            {status === 'waiting' && (
                <button onClick={captureAndVerify} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-bold transition">
                    I'm Ready
                </button>
            )}

            {status === 'verifying' && (
                <div className="py-3 text-cyan-400 font-semibold animate-pulse flex justify-center items-center gap-2">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                </div>
            )}

            {status === 'failed' && (
                <button onClick={captureAndVerify} className="w-full bg-red-500/20 text-red-400 py-3 rounded-xl font-bold border border-red-500/30 hover:bg-red-500/30 transition">
                    Verification failed. Retry.
                </button>
            )}
        </div>
    );
}