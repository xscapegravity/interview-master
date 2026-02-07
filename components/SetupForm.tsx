
import React, { useState, useRef, useEffect } from 'react';
import { InterviewSetup } from '../types';

interface SetupFormProps {
  onStart: (setup: InterviewSetup) => void;
}

export const SetupForm: React.FC<SetupFormProps> = ({ onStart }) => {
  const [formData, setFormData] = useState<InterviewSetup>({
    jdUrl: '',
    resumeUrl: '',
    jdText: '',
    resumeText: '',
    mode: 'voice'
  });

  // Audio Test State
  const [micLevel, setMicLevel] = useState(0);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [isSpeakerTesting, setIsSpeakerTesting] = useState(false);
  const [audioChecks, setAudioChecks] = useState({ mic: false, speaker: false });
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      setIsMicTesting(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setMicLevel(average);
        if (average > 10) setAudioChecks(prev => ({ ...prev, mic: true }));
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Please enable microphone access to proceed with a voice interview.");
    }
  };

  const stopMicTest = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    setIsMicTesting(false);
    setMicLevel(0);
  };

  const playTestSound = () => {
    setIsSpeakerTesting(true);
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, context.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.5); // A5
    
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
    
    setTimeout(() => {
      setIsSpeakerTesting(false);
      setAudioChecks(prev => ({ ...prev, speaker: true }));
    }, 600);
  };

  useEffect(() => {
    return () => stopMicTest();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stopMicTest();
    onStart(formData);
  };

  const isReady = ((formData.jdUrl || formData.jdText) && (formData.resumeUrl || formData.resumeText));

  return (
    <div className="max-w-2xl w-full bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2">Prepare Your Session</h2>
        <p className="text-slate-400">Provide the job context and check your gear.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Document Inputs */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Job Description URL</label>
              <input
                type="url"
                placeholder="https://linkedin.com/jobs/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.jdUrl}
                onChange={e => setFormData(prev => ({ ...prev, jdUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Resume URL (Optional)</label>
              <input
                type="url"
                placeholder="https://my-resume.pdf"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.resumeUrl}
                onChange={e => setFormData(prev => ({ ...prev, resumeUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Or Paste Job Description Text</label>
            <textarea
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
              placeholder="Paste the full job responsibilities here..."
              value={formData.jdText}
              onChange={e => setFormData(prev => ({ ...prev, jdText: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Or Paste Your Resume Text</label>
            <textarea
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
              placeholder="Paste your professional experience here..."
              value={formData.resumeText}
              onChange={e => setFormData(prev => ({ ...prev, resumeText: e.target.value }))}
            />
          </div>
        </section>

        {/* Audio System Check */}
        <section className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 space-y-4">
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">System Check</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mic Test */}
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Microphone</span>
                {audioChecks.mic && <span className="text-green-500 text-[10px] font-bold">READY</span>}
              </div>
              
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-sm transition-all duration-75 ${
                      micLevel > (i * 8) ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={isMicTesting ? stopMicTest : startMicTest}
                className={`w-full py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isMicTesting ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {isMicTesting ? 'Stop Test' : 'Test Microphone'}
              </button>
            </div>

            {/* Speaker Test */}
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Speakers</span>
                {audioChecks.speaker && <span className="text-green-500 text-[10px] font-bold">READY</span>}
              </div>
              
              <div className="flex items-center justify-center h-2">
                <div className={`w-full h-0.5 bg-slate-900 rounded-full relative overflow-hidden`}>
                   {isSpeakerTesting && <div className="absolute inset-0 bg-indigo-500 animate-[shimmer_1s_infinite]"></div>}
                </div>
              </div>

              <button
                type="button"
                onClick={playTestSound}
                disabled={isSpeakerTesting}
                className="w-full py-1.5 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {isSpeakerTesting ? 'Playing...' : 'Play Test Sound'}
              </button>
            </div>
          </div>
        </section>

        {/* Mode & Start */}
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-300">Interview Mode</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, mode: 'voice' }))}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                  formData.mode === 'voice'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Voice
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, mode: 'text' }))}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                  formData.mode === 'text'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Text
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isReady}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            {isReady ? 'Begin Deep-Dive Interview' : 'Complete Setup to Start'}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
