import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { InterviewSetup, Message } from '../types';

// Utility functions for audio encoding/decoding
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


export function useLiveInterview(setup: InterviewSetup) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnecting, setIsConnecting] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const sessionRef = useRef<any>(null);
    const transcriptBufferRef = useRef({ user: '', model: '' });
    const sessionVersionRef = useRef(0);
    const streamRef = useRef<MediaStream | null>(null);


    const endSession = useCallback(() => {
        sessionVersionRef.current++; // Invalidate current session
        if (sessionRef.current) {
            try { sessionRef.current.close(); } catch (e) { console.error("Error closing session:", e); }
            sessionRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            try { inputAudioContextRef.current.close(); } catch (e) { console.error("Error closing input audio context:", e); }
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            try { outputAudioContextRef.current.close(); } catch (e) { console.error("Error closing output audio context:", e); }
            outputAudioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        sourcesRef.current.forEach(s => {
            try { s.stop(); } catch (e) {}
        });
        sourcesRef.current.clear();
        setIsActive(false);
    }, []);

    const startSession = useCallback(async (version: number) => {
        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error("API Key not found");

            const ai = new GoogleGenAI({ apiKey });

            const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            if (version !== sessionVersionRef.current) {
                inCtx.close();
                outCtx.close();
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            streamRef.current = stream;
            inputAudioContextRef.current = inCtx;
            outputAudioContextRef.current = outCtx;

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
                        if (version !== sessionVersionRef.current) return;
                        setIsConnecting(false);
                        setIsActive(true);
                        
                        const source = inCtx.createMediaStreamSource(stream);
                        const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.onaudioprocess = (e) => {
                          if (version !== sessionVersionRef.current || !sessionRef.current) return;
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
                          sessionRef.current.sendRealtimeInput({ media: pcmBlob });
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inCtx.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (version !== sessionVersionRef.current) return;
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

                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            setIsAgentSpeaking(true);
                            const ctx = outputAudioContextRef.current;
                            if (!ctx || ctx.state === 'closed') return;

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
                        if (version !== sessionVersionRef.current) return;
                        console.error('Gemini Error:', e);
                        setError('The interview session was interrupted. Please try again.');
                        endSession();
                    },
                    onclose: () => {
                        if (version !== sessionVersionRef.current) return;
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

            const session = await sessionPromise;
            if (version !== sessionVersionRef.current) {
                session.close();
                stream.getTracks().forEach(track => track.stop());
                inCtx.close();
                outCtx.close();
                return;
            }
            sessionRef.current = session;

        } catch (err: any) {
            if (version !== sessionVersionRef.current) return;
            console.error(err);
            setError(err.message || 'Failed to initialize AI Interviewer');
            setIsConnecting(false);
        }
    }, [setup, endSession]);

    useEffect(() => {
        const version = ++sessionVersionRef.current;
        startSession(version);
        return () => {
            endSession();
        };
    }, [startSession, endSession]);

    return { messages, isConnecting, isActive, isAgentSpeaking, error, endSession };
}