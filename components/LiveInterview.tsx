import React, { useEffect, useRef, useState, useCallback } from 'react';
import { InterviewSetup } from '../types';
import { useLiveInterview } from '../hooks/useLiveInterview';

interface LiveInterviewProps {
  setup: InterviewSetup;
  onEnd: () => void;
}

export function LiveInterview({ setup, onEnd }: LiveInterviewProps) {
  const { messages, isConnecting, isActive, isAgentSpeaking, error, micLevel, endSession } = useLiveInterview(setup);
  const [showExitModal, setShowExitModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Small delay to ensure the DOM has updated with the new message
    const timeoutId = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeoutId);
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
    <div className="w-full max-w-6xl flex flex-col h-[calc(100vh-12rem)] relative bg-slate-800/20 md:bg-slate-800/30 rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden backdrop-blur-sm">
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

      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Agent Panel (Sidebar) */}
        {!isConnecting && (
          <div className="hidden md:flex w-80 flex-shrink-0 bg-slate-900/30 border-r border-slate-700/50 p-6 flex-col items-center justify-center space-y-8">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isAgentSpeaking ? 'ring-8 ring-indigo-500/20 bg-indigo-500/10' : 'bg-slate-800'}`}>
                {isAgentSpeaking ? (
                  <div className="flex items-end gap-1.5 h-12">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-1.5 bg-indigo-400 rounded-full animate-bounce"
                        style={{ 
                          height: '24px',
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: '0.6s'
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <svg className="w-16 h-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2 rounded-lg shadow-xl">
                 <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                 </svg>
              </div>
            </div>
            <div className="text-center space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200">AI Interviewer</h4>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  {isAgentSpeaking ? 'Speaking...' : 'Listening...'}
                </p>
              </div>

              {/* User Mic Visualizer Moved Here */}
              <div className="pt-4 border-t border-slate-700/50 flex flex-col items-center gap-3">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Your Microphone
                </span>
                <div className="flex items-end gap-1 h-6 text-green-400">
                  {[...Array(12)].map((_, i) => {
                    const threshold = i * 4; 
                    const isActive = micLevel > threshold;
                    const height = isActive ? Math.min(20, (micLevel / 12) + Math.random() * 8) : 3;
                    return (
                      <div 
                        key={i} 
                        className={`w-1 rounded-full transition-all duration-75 ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-700/50'}`}
                        style={{ height: `${height}px` }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
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
            <div className="flex-1 flex flex-col min-h-0">
              <div ref={scrollContainerRef} className="flex-1 overflow-x-hidden pr-2 space-y-6 scrollbar-always-y scroll-smooth">
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
                    <div className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${ 
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-slate-700/50 text-slate-100 border border-slate-600 rounded-bl-none'
                    }`}>
                      <p className="text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                      <span className="text-[10px] opacity-50 mt-2 block">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-4 w-full" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Visualizer Overlay / Control Bar */}
      {isActive && setup.mode === 'voice' && !isConnecting && (
        <div className="h-20 px-6 py-4 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 flex items-center justify-center">
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
                {isAgentSpeaking ? 'Interviewer is speaking...' : 'Interviewer is listening to you...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}