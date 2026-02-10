import { useEffect, useRef, useState, useCallback } from 'react';
import { LiveServerMessage } from '@google/genai';
import { InterviewSetup, Message } from '../types';
import { generateInterviewPrompt } from '../lib/interviewPrompt';

function b64decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function b64encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function useLiveInterview(setup: InterviewSetup) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnecting, setIsConnecting] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [micLevel, setMicLevel] = useState(0);
    const [isFeedbackRequested, setIsFeedbackRequested] = useState(false);
    const [isFeedbackComplete, setIsFeedbackComplete] = useState(false);
    const [feedbackTimeout, setFeedbackTimeout] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const transcriptBufferRef = useRef({ user: '', model: '' });
    const sessionVersionRef = useRef(0);
    const feedbackRequestedRef = useRef(false);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const feedbackAudioReceivedRef = useRef(false);
    const feedbackTurnCompleteRef = useRef(false);
    const outputAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    // The endSession function is now stable and can be safely returned
    const endSession = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.close();
        }
    }, []);

    const sendFeedbackRequest = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log("📝 Sending feedback request to model");
            setIsFeedbackRequested(true);
            feedbackRequestedRef.current = true;
            
            // Fix #1: Stop microphone processing
            if (scriptProcessorRef.current) {
                console.log("🎤 Disconnecting microphone for feedback mode");
                scriptProcessorRef.current.onaudioprocess = null;
            }
            
            // Fix #2: Improved structured feedback prompt
            const feedbackPrompt = `The candidate has requested to end the interview and receive feedback.

Please respond in TWO parts:

1. CONCLUSION: First, naturally conclude the interview. Thank them for their time and say goodbye.

2. FEEDBACK: Then provide structured feedback in this exact format:

**STRENGTHS:**
- [Strength 1]
- [Strength 2]

**AREAS FOR IMPROVEMENT:**
- [Area 1]
- [Area 2]

Keep the feedback professional, specific, and constructive.`;
            
            wsRef.current.send(JSON.stringify({ 
                type: 'TEXT', 
                payload: feedbackPrompt
            }));
            
            // Reset feedback tracking refs
            feedbackAudioReceivedRef.current = false;
            feedbackTurnCompleteRef.current = false;
            
            // Fix #5: Add feedback timeout (90 seconds)
            // Note: timeout no longer sets error (which would wipe the UI), just marks completion
            feedbackTimeoutRef.current = setTimeout(() => {
                console.log("⏱️ Feedback timeout reached — marking feedback complete so user can still access transcript");
                setFeedbackTimeout(true);
                // Flush any remaining transcript buffer to messages
                const {user, model} = transcriptBufferRef.current;
                if (user.trim() || model.trim()) {
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        if (user.trim()) newMsgs.push({ role: 'user', text: user, timestamp: Date.now() });
                        if (model.trim()) newMsgs.push({ role: 'model', text: model, timestamp: Date.now() });
                        return newMsgs;
                    });
                    transcriptBufferRef.current = { user: '', model: '' };
                }
                setIsFeedbackComplete(true);
            }, 90000);
        }
    }, []);

    useEffect(() => {
        // Use the current version (don't increment yet)
        const currentVersion = sessionVersionRef.current;
        console.log(`🔵 [useLiveInterview] Starting session version ${currentVersion}`);
        
        // === All logic is now self-contained in this effect ===
        let inputAudioContext: AudioContext | null = null;
        let outputAudioContext: AudioContext | null = null;
        let scriptProcessor: ScriptProcessorNode | null = null;
        // Use the ref-backed set for audio sources so feedback completion logic can check it
        const outputAudioSources = outputAudioSourcesRef.current;
        outputAudioSources.clear();
        let mediaStreamSource: MediaStreamAudioSourceNode | null = null;
        let stream: MediaStream | null = null;
        let nextStartTime = 0;
        let ws: WebSocket | null = null;
        let micAnalyser: AnalyserNode | null = null;
        let micAnimationFrame: number | null = null;

        const cleanup = (reason: string) => {
            console.log(`🔴 [useLiveInterview] Cleaning up version ${currentVersion}. Reason: ${reason}`);
            setIsActive(false);
            setIsConnecting(false);

            if (ws) {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                if (ws.readyState === WebSocket.OPEN) {
                  ws.close();
                }
                ws = null;
            }
            if (wsRef.current === ws) {
                wsRef.current = null;
            }
            if (scriptProcessor) {
                scriptProcessor.disconnect();
                scriptProcessor = null;
            }
            if (scriptProcessorRef.current) {
                scriptProcessorRef.current = null;
            }
            if (mediaStreamSource) {
                mediaStreamSource.disconnect();
                mediaStreamSource = null;
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            if (inputAudioContext && inputAudioContext.state !== 'closed') {
                console.log(`🔴 Closing inputAudioContext for version ${currentVersion}`);
                inputAudioContext.close();
            }
            if (outputAudioContext && outputAudioContext.state !== 'closed') {
                console.log(`🔴 Closing outputAudioContext for version ${currentVersion}`);
                outputAudioContext.close();
            }
            if (micAnimationFrame) {
                cancelAnimationFrame(micAnimationFrame);
                micAnimationFrame = null;
            }
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
                feedbackTimeoutRef.current = null;
            }
            setMicLevel(0);
            outputAudioSources.forEach(s => { try { s.stop(); } catch (e) {} });
            outputAudioSources.clear();
        };

        const connect = async () => {
            try {
                // Check if this version is still current
                if (currentVersion !== sessionVersionRef.current) {
                    console.log(`Session version ${currentVersion} cancelled before WebSocket creation`);
                    return;
                }

                // Small delay to allow React StrictMode cleanup to run first
                await new Promise(resolve => setTimeout(resolve, 10));

                // Check again after delay
                if (currentVersion !== sessionVersionRef.current) {
                    console.log(`Session version ${currentVersion} cancelled after delay`);
                    return;
                }

                // 1. Set up WebSocket
                ws = new WebSocket('ws://localhost:3001');

                ws.onopen = async () => {
                    // Check if this version is still current
                    if (currentVersion !== sessionVersionRef.current) {
                        console.log(`Session version ${currentVersion} cancelled at onopen`);
                        ws?.close();
                        return;
                    }

                    console.log(`Connected to WebSocket server (version ${currentVersion})`);
                    wsRef.current = ws;
                    
                    // 2. Set up Audio
                    console.log(`🟢 Creating AudioContexts for version ${currentVersion}`);
                    inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                    // Check again after async operation
                    if (currentVersion !== sessionVersionRef.current) {
                        console.log(`Session version ${currentVersion} cancelled after getUserMedia`);
                        cleanup('Post-getUserMedia Invalidation');
                        return;
                    }

                    // Check if WebSocket is still open
                    if (ws?.readyState !== WebSocket.OPEN) {
                        console.log(`WebSocket closed during setup, aborting audio initialization`);
                        cleanup('WebSocket closed during setup');
                        return;
                    }

                    // 3. Start processing microphone audio
                    // NOTE: ScriptProcessorNode is deprecated but used here for cross-browser simplicity.
                    // For production high-performance audio, migration to AudioWorkletNode is recommended.
                    mediaStreamSource = inputAudioContext.createMediaStreamSource(stream);
                    scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    let audioStarted = false;
                    const systemInstruction = generateInterviewPrompt(setup);

                    scriptProcessor.onaudioprocess = (e) => {
                        if (currentVersion !== sessionVersionRef.current) return;
                        if (ws?.readyState !== WebSocket.OPEN) return;
                        
                        // Send INITIAL_SETUP on first audio buffer to ensure audio is flowing
                        if (!audioStarted) {
                            audioStarted = true;
                            console.log('🎤 Audio pipeline active, sending INITIAL_SETUP');
                            ws?.send(JSON.stringify({ type: 'INITIAL_SETUP', payload: systemInstruction }));
                        }
                        
                        // Don't send audio if feedback is requested
                         if (feedbackRequestedRef.current) return;

                        const inputData = e.inputBuffer.getChannelData(0);
                        const int16 = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBase64 = b64encode(new Uint8Array(int16.buffer));
                        ws?.send(JSON.stringify({ type: 'AUDIO', payload: pcmBase64 }));
                    };

                    mediaStreamSource.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                    
                    // Set up microphone level monitoring
                    micAnalyser = inputAudioContext.createAnalyser();
                    micAnalyser.fftSize = 256;
                    mediaStreamSource.connect(micAnalyser);
                    
                    const micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);
                    const updateMicLevel = () => {
                        if (currentVersion !== sessionVersionRef.current || !micAnalyser) return;
                        
                        micAnalyser.getByteFrequencyData(micDataArray);
                        const average = micDataArray.reduce((a, b) => a + b) / micDataArray.length;
                        setMicLevel(average);
                        
                        micAnimationFrame = requestAnimationFrame(updateMicLevel);
                    };
                    updateMicLevel();
                    
                    setIsConnecting(false);
                    setIsActive(true);
                };

                ws.onmessage = async (event) => {
                    if (currentVersion !== sessionVersionRef.current) return;

                    const message: any = JSON.parse(event.data);
                    // Descriptive logging to see the actual content of the incoming message
                    console.log(`📡 [WS Received] Type: ${message.serverContent ? 'Content' : 'Meta'}`, {
                        text: message.serverContent?.modelTurn?.parts?.map((p: any) => p.text).filter(Boolean).join(' '),
                        audio: !!message.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData),
                        complete: !!(message.serverContent?.turnComplete || message.serverContent?.generationComplete),
                        raw: message
                    });

                    // Handle warning and timeout messages
                    if (message.type === 'WARNING') {
                        console.log('⚠️ Inactivity warning:', message.message);
                        setError(message.message);
                        return;
                    }

                    if (message.type === 'SESSION_TIMEOUT') {
                        console.log('❌ Session timeout:', message.message);
                        setError(message.message);
                        return;
                    }

                    // Capture direct text parts from the model turn (highest priority for transcript)
                    const textPart = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
                    if (textPart) {
                        // Direct text content takes priority — don't also add outputTranscription
                        // to avoid doubling up the same content
                        transcriptBufferRef.current.model += textPart;
                    } else if (message.serverContent?.outputTranscription) {
                        // Audio transcription (fallback when no direct text part)
                        transcriptBufferRef.current.model += message.serverContent.outputTranscription.text;
                    }
                    
                    if (message.serverContent?.inputTranscription) {
                        transcriptBufferRef.current.user += message.serverContent.inputTranscription.text;
                    }

                    if (message.serverContent?.turnComplete || message.serverContent?.generationComplete) {
                        const {user, model} = transcriptBufferRef.current;
                        
                        if (user.trim() || model.trim()) {
                            setMessages(prev => {
                                const newMsgs = [...prev];
                                if (user.trim()) newMsgs.push({ role: 'user', text: user, timestamp: Date.now() });
                                if (model.trim()) newMsgs.push({ role: 'model', text: model, timestamp: Date.now() });
                                return newMsgs;
                            });
                            transcriptBufferRef.current = { user: '', model: '' };
                        }
                        
                        // Handle feedback completion logic
                        if (feedbackRequestedRef.current) {
                            // Clear the timeout since we got a response
                            if (feedbackTimeoutRef.current) {
                                clearTimeout(feedbackTimeoutRef.current);
                                feedbackTimeoutRef.current = null;
                            }
                            feedbackTurnCompleteRef.current = true;
                            
                            // If no audio was received during feedback, or all audio already finished,
                            // mark feedback as complete immediately.
                            // Otherwise, the onended handler will do it.
                            if (!feedbackAudioReceivedRef.current || outputAudioSources.size === 0) {
                                console.log('✅ Feedback turn complete — no outstanding audio, marking complete');
                                setIsFeedbackComplete(true);
                            } else {
                                console.log('⏳ Feedback turn complete — waiting for audio playback to finish');
                            }
                        }
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContext) {
                        // Track that audio was received during feedback mode
                        if (feedbackRequestedRef.current) {
                            feedbackAudioReceivedRef.current = true;
                        }
                        
                        setIsAgentSpeaking(true);
                        const ctx = outputAudioContext;
                        nextStartTime = Math.max(nextStartTime, ctx.currentTime);
                        
                        // Simplified audio decoding
                        const decodedBytes = b64decode(base64Audio);
                        const audioData = new Int16Array(decodedBytes.buffer);
                        const frameCount = audioData.length;
                        const audioBuffer = ctx.createBuffer(1, frameCount, 24000);
                        const channelData = audioBuffer.getChannelData(0);
                        for (let i = 0; i < frameCount; i++) {
                            channelData[i] = audioData[i] / 32768.0;
                        }

                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(ctx.destination);
                        
                        source.onended = () => {
                            outputAudioSources.delete(source);
                            if (outputAudioSources.size === 0) {
                                setIsAgentSpeaking(false);
                                // If feedback turn already completed and all audio finished, mark complete
                                if (feedbackRequestedRef.current && feedbackTurnCompleteRef.current) {
                                    console.log('✅ All feedback audio done playing — marking feedback complete');
                                    setIsFeedbackComplete(true);
                                }
                            }
                        };

                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        outputAudioSources.add(source);
                    }
                     if (message.serverContent?.interrupted) {
                        outputAudioSources.forEach(s => { try { s.stop(); } catch (e) {} });
                        outputAudioSources.clear();
                        nextStartTime = 0;
                        setIsAgentSpeaking(false);
                    }
                };

                ws.onerror = (err) => {
                    if (currentVersion !== sessionVersionRef.current) return;
                    console.error("WebSocket Error:", err);
                    setError("Connection failed. Please ensure the server is running.");
                    cleanup('WebSocket Error');
                };

                ws.onclose = () => {
                    if (currentVersion !== sessionVersionRef.current) return;
                    console.log(`WebSocket connection closed (version ${currentVersion})`);
                    cleanup('WebSocket Close');
                };

            } catch (err: any) {
                if (currentVersion !== sessionVersionRef.current) return;
                console.error("Failed to initialize interview:", err);
                setError(err.message || "Failed to initialize interview session.");
                cleanup('Init Catch Error');
            }
        };

        connect();

        return () => {
            // Only invalidate if this cleanup is for the currently active version
            if (currentVersion === sessionVersionRef.current) {
                sessionVersionRef.current++;
                console.log(`🔴 Cleanup called for CURRENT version ${currentVersion}, incrementing to ${sessionVersionRef.current}`);
            } else {
                console.log(`🟡 Cleanup called for OLD version ${currentVersion}, current is ${sessionVersionRef.current} (no increment)`);
            }
            cleanup('Effect Cleanup (unmount or dependency change)');
        };

    // We only want this effect to re-run if the core interview setup changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setup]);

    return { messages, isConnecting, isActive, isAgentSpeaking, error, micLevel, endSession, sendFeedbackRequest, isFeedbackRequested, isFeedbackComplete, feedbackTimeout };
}