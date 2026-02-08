import React, { useEffect, useRef, useState, useCallback } from 'react';
import { InterviewSetup } from '../types';
import { useLiveInterview } from '../hooks/useLiveInterview';

interface LiveInterviewProps {
  setup: InterviewSetup;
  onEnd: () => void;
}

export function LiveInterview({ setup, onEnd }: LiveInterviewProps) {
  const { messages, isConnecting, isActive, isAgentSpeaking, error, endSession } = useLiveInterview(setup);
  const [showExitModal, setShowExitModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle browser close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActive && messages.length > 0 && !showExitModal) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive, messages, showExitModal]);

  const downloadTranscript = useCallback(() => {
    if (messages.length === 0) return;

    const transcriptText = messages
      .map(m => {
        const time = new Date(m.timestamp).toLocaleTimeString();
        const role = m.role === 'user' ? 'Candidate' : 'Interviewer';
        return `[${time}] ${role}: ${m.text}`;
      })
      .join('\n\n');

    const header = `--- INTERVIEW TRANSCRIPT ---\nDate: ${new Date().toLocaleDateString()}\nJob Context: ${setup.jdUrl || 'Pasted Text'}\n\n`;
    const blob = new Blob([header + transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interview_Transcript_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, setup]);

  const handleEndSessionClick = () => {
    endSession();
    setShowExitModal(true);
  };
  
  const handleFinalExit = () => {
      setShowExitModal(false);
      onEnd();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-4">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h3 className="text-2xl font-bold">Session Error</h3>
        <p className="text-slate-400 max-w-md">{error}</p>
        <button onClick={onEnd} className="bg-slate-700 px-6 py-2 rounded-lg hover:bg-slate-600 transition-colors">Go Back</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex flex-col h-[calc(100vh-12rem)] relative bg-slate-800/30 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
      {/* Exit Modal Overlay */}
      {showExitModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-2xl space-y-6 transform animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Interview Concluded</h2>
              <p className="text-slate-400">Would you like to save a copy of your session transcript before exiting?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={downloadTranscript}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                Download Transcript (.txt)
              </button>
              <button
                onClick={handleFinalExit}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-xl transition-all"
              >
                Exit without Saving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="px-6 py-3 bg-slate-900/50 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
          <span className="text-sm font-medium text-slate-300">
            {isConnecting ? 'Initializing Interviewer...' : isActive ? 'Session Live' : 'Session Ended'}
          </span>
        </div>
        <button
            onClick={handleEndSessionClick}
            disabled={!isActive || showExitModal}
            className="px-4 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full hover:bg-red-500/20 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
            End Session
        </button>
      </div>

      {/* Messages / Visualizer */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {isConnecting ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Reviewing Documents</h3>
              <p className="text-slate-500 text-sm">The agent is analyzing the job description and your resume.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                  <div className="p-4 bg-slate-700/30 rounded-full">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <p>
                    {isActive 
                        ? <>Speak clearly into your microphone.<br/>The agent will respond in real-time.</>
                        : 'The interview has ended.'
                    }
                  </p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${ 
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-slate-700/50 text-slate-100 border border-slate-600 rounded-bl-none'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <span className="text-[10px] opacity-50 mt-2 block">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Voice Visualizer Overlay / Control Bar */}
      {isActive && setup.mode === 'voice' && !isConnecting && (
        <div className="h-24 px-6 py-4 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex items-end gap-1 h-8 ${isAgentSpeaking ? 'text-indigo-400' : 'text-slate-500'}`}>
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 rounded-full transition-all duration-150 ${isAgentSpeaking ? 'animate-bounce' : ''}`}
                  style={{ 
                    height: isAgentSpeaking ? `${Math.random() * 20 + 10}px` : '4px',
                    animationDelay: isAgentSpeaking ? `${i * 0.1}s` : undefined
                  }}
                />
              ))}
            </div>
             <span className="text-sm font-medium text-slate-400">
                {isAgentSpeaking ? 'Interviewer is speaking...' : 'Your turn...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}