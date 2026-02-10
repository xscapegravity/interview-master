import { describe, it, expect, beforeAll } from 'vitest';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import { INTERVIEW_SETTINGS } from './constants';

import path from 'path';

// Try to load .env from current dir or parent
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

describe('Feedback API Integration', () => {
  const API_KEY = process.env.API_KEY || process.env.VITE_API_KEY;

  beforeAll(() => {
    if (!API_KEY) {
      console.warn('⚠️ Skipping Integration Test: API_KEY not found in .env');
    }
  });

  it('should successfully receive a structured feedback response from Gemini', async () => {
    if (!API_KEY) return; // Skip if no key

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const systemInstruction = "You are a professional technical interviewer. Conclude with feedback when requested.";
    const feedbackPrompt = "The candidate has finished. Please provide feedback in STRENGTHS and AREAS FOR IMPROVEMENT format.";

    const result = await new Promise((resolve, reject) => {
      let fullTextResponse = "";
      
      const sessionPromise = ai.live.connect({
        model: INTERVIEW_SETTINGS.MODEL_ID,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            const session = await sessionPromise;
            // Use the corrected method name
            session.sendClientContent({
              turns: [{
                role: 'user',
                parts: [{ text: feedbackPrompt }]
              }],
              turnComplete: true
            });
          },
          onmessage: (message: any) => {
            const textPart = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
            const transPart = message.serverContent?.outputTranscription?.text;
            
            if (textPart) fullTextResponse += textPart;
            else if (transPart) fullTextResponse += transPart;

            if (message.serverContent?.turnComplete || message.serverContent?.generationComplete) {
              resolve(fullTextResponse);
            }
          },
          onerror: (err) => {
            reject(err);
          },
          onclose: () => {
            // resolve if we got something
            if (fullTextResponse) resolve(fullTextResponse);
          }
        }
      });
      
      // Safety timeout
      setTimeout(() => reject(new Error('Test timed out after 30s')), 30000);
    });

    expect(result).toBeDefined();
    const text = result as string;
    expect(text.length).toBeGreaterThan(0);
    console.log('✅ Received response length:', text.length);
  }, 35000); // 35s timeout for the test loop
});
