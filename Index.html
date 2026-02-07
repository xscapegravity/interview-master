
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { InterviewSetup, Message } from '../types';

interface LiveInterviewProps {
  setup: InterviewSetup;
  onEnd: () => void;
}

// Utility functions for audio encoding/decoding as per @google/genai specs
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const LiveInterview: React.FC<LiveInterviewProps> = ({ setup, onEnd }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const transcriptBufferRef = useRef({ user: '', model: '' });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle browser close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (messages.length > 0 && !showExitModal) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, showExitModal]);

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

  const startSession = useCallback(async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const systemInstruction = `
        Role: You are a Senior Interviewer and Active Listener. Your goal is to conduct a deep-dive behavioral interview based on the provided Job Description (JD) and Candidate Resume.

        CONTEXT:
        JD Text: ${setup.jdText || 'Refer to provided URL'}
        JD URL: ${setup.jdUrl}
        Resume Text: ${setup.resumeText || 'Refer to provided URL'}
        Resume URL: ${setup.resumeUrl}

        OBJECTIVE: Deeply understand the interviewee’s experience, thinking, and motivations. You are not "testing" them; you are uncovering their story.

        CORE CONSTRAINTS:
        1. One Question at a Time: Never ask "double-barreled" or multiple questions in one turn.
        2. Wait for Response: Do not move to a new topic until the current question is fully addressed.
        3. Reflect and Validate: Before moving to a new question, briefly summarize or reflect back what you heard to show active listening.
        4. No Advice: Do not give feedback or advice unless the user explicitly asks for it.
        5. Tone: Calm, professional, curious, and empathetic.

        EXECUTION:
        State: "I've reviewed the roles. Let's begin. The purpose of this interview is to understand the 'how' and 'why' behind your journey."
        Then start with one open-ended warm-up question.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };

              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              transcriptBufferRef.current.model += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              transcriptBufferRef.current.user += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const userText = transcriptBufferRef.current.user;
              const modelText = transcriptBufferRef.current.model;
              
              setMessages(prev => {
                const newMsgs = [...prev];
                if (userText.trim()) newMsgs.push({ role: 'user', text: userText, timestamp: Date.now() });
                if (modelText.trim()) newMsgs.push({ role: 'model', text: modelText, timestamp: Date.now() });
                return newMsgs;
              });

              transcriptBufferRef.current = { user: '', model: '' };
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsAgentSpeaking(true);
              const ctx = outputAudioContextRef.current!;
              if (ctx.state === 'closed') return;

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setIsAgentSpeaking(false);
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAgentSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error('Gemini Error:', e);
            setError('The interview session was interrupted. Please try again.');
          },
          onclose: () => {
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to initialize AI Interviewer');
      setIsConnecting(false);
    }
  }, [setup]);

  useEffect(() => {
    startSession();
    return () => {
      if (sessionRef.current) {
        try { sessionRef.current.close(); } catch (e) {}
      }
      if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        try { inputAudioContextRef.current.close(); } catch (e) {}
      }
      if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        try { outputAudioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [startSession]);

  const handleEndSessionClick = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
    }
    setIsActive(false);
    setShowExitModal(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
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
                onClick={onEnd}
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
        <div className="flex gap-2">
          {setup.mode === 'voice' && isActive && (
            <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/30">
              VOICE ACTIVE
            </div>
          )}
        </div>
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
              <p className="text-slate-500 text-sm">The agent is analyzing your JD and resume to prepare the deep-dive questions.</p>
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
                  <p>Speak clearly into your microphone.<br/>The agent will respond in real-time.</p>
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
                  className={`w-1.5 rounded-full transition-all duration-150 ${isAgentSpeaking ? 'animate-bounce' : 'h-2'}`}
                  style={{ 
                    height: isAgentSpeaking ? `${Math.random() * 20 + 10}px` : '4px',
                    animationDelay: `${i * 0.1}s` 
                  }}
                />
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {isAgentSpeaking ? 'Agent Speaking' : 'Listening...'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleEndSessionClick}
            className="flex items-center gap-2 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-full font-medium transition-all"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            End Session
          </button>
        </div>
      )}

      {/* End Button for Text Mode (if not speaking/using voice) */}
      {!isActive && !isConnecting && !showExitModal && (
        <div className="p-4 flex justify-center border-t border-slate-700">
          <button onClick={() => setShowExitModal(true)} className="px-6 py-2 bg-indigo-600 rounded-lg font-bold">Review Transcript</button>
        </div>
      )}
    </div>
  );
};
