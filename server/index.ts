import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors()); // Allow requests from the frontend

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY not found in .env file");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

wss.on('connection', (ws) => {
  console.log('Client connected');

  let geminiSession: any = null;
  let systemInstructionReceived = false;
  let sessionReady = false;
  const audioQueue: any[] = [];
  let audioMessageCount = 0;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Received message from client: ${data.type}`);
      
      // The client will send structured messages
      if (data.type === 'INITIAL_SETUP' && !systemInstructionReceived) {
          systemInstructionReceived = true;
          console.log('Creating Gemini session with system instruction');
          
          try {
            // Create the Gemini session with the system instruction
            const sessionPromise = ai.live.connect({
              model: 'gemini-2.5-flash-native-audio-preview-12-2025',
              config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: data.payload,
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                },
                outputAudioTranscription: {},
                inputAudioTranscription: {},
              },
              callbacks: {
                onopen: async () => {
                  console.log('Gemini session opened');
                  sessionReady = true;
                  
                  try {
                    // Get the session reference
                    const session = await sessionPromise;
                    
                    // Process queued audio messages
                    console.log(`Processing ${audioQueue.length} queued audio messages`);
                    while (audioQueue.length > 0) {
                      const audioData = audioQueue.shift();
                      session.sendRealtimeInput({
                        media: {
                          data: audioData,
                          mimeType: 'audio/pcm;rate=16000'
                        }
                      });
                    }
                    console.log('Finished processing queued audio');
                  } catch (err) {
                    console.error('Error in onopen callback:', err);
                  }
                },
                onmessage: (message: LiveServerMessage) => {
                  console.log('📨 Gemini message:', JSON.stringify(message).substring(0, 200));
                  // Forward message from Gemini to the client
                  ws.send(JSON.stringify(message));
                },
                onerror: (e) => {
                  console.error('Gemini Error:', e);
                  ws.send(JSON.stringify({ error: 'Gemini session error.' }));
                  ws.close();
                },
                onclose: () => {
                  console.log('Gemini session closed');
                  sessionReady = false;
                  if (ws.readyState === ws.OPEN) {
                    ws.close();
                  }
                }
              }
            });
            
            geminiSession = await sessionPromise;
            console.log('Gemini session created successfully');
          } catch (err) {
            console.error('Error creating Gemini session:', err);
            ws.send(JSON.stringify({ error: 'Failed to create Gemini session.' }));
          }
          
      } else if (data.type === 'AUDIO') {
          if (sessionReady && geminiSession) {
            // Session is ready, send immediately
            audioMessageCount++;
            if (audioMessageCount % 10 === 0) {
              console.log(`Sent ${audioMessageCount} audio messages to Gemini`);
            }
            geminiSession.sendRealtimeInput({
              media: {
                data: data.payload,
                mimeType: 'audio/pcm;rate=16000'
              }
            });
          } else {
            // Session not ready yet, queue the audio
            console.log(`Queueing audio message (session not ready), queue size: ${audioQueue.length + 1}`);
            audioQueue.push(data.payload);
          }
      }

    } catch (error) {
      console.error('Error processing client message:', error);
      ws.send(JSON.stringify({ error: 'Failed to process message.' }));
    }
  });

  ws.on('close', async () => {
    console.log('Client disconnected');
    if (geminiSession) {
      try {
        geminiSession.close();
      } catch(e) {
        console.error("Error closing session on client disconnect:", e);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});
