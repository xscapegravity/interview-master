/**
 * Interview Session Configuration
 */
export const INTERVIEW_SETTINGS = {
  // Time before a "Are you still there?" warning is sent (in milliseconds)
  INACTIVITY_WARNING_MS: 60000, // 60 seconds
  
  // Time after the warning before the session is force-closed (in milliseconds)
  SESSION_TIMEOUT_MS: 60000,    // Another 60 seconds (120s total)
  
  // Audio sampling rates
  INPUT_SAMPLE_RATE: 16000,
  OUTPUT_SAMPLE_RATE: 24000,
  
  // Gemini Model Identifier
  MODEL_ID: 'gemini-2.5-flash-native-audio-preview-12-2025'
};
