# Start of Selection

---

### **Master Generation Prompt**

**Project Goal:**
Create "Interview Master," a real-time, voice-based technical interview application where users practice interviews with an AI agent. The app uses **Google's Gemini Multimodal Live API** for low-latency voice interaction.

**Tech Stack:**

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Lucide React (icons).
- **Backend:** Node.js, Express, `ws` (WebSockets), `@google/genai` SDK.
- **Communication:** WebSockets for bidirectional audio streaming (Client <-> Node Server <-> Gemini).

**Key Features:**

1.  **AI Persona:** A "Senior Technical Interviewer" that conducts deep-dive interviews based on a provided Job Description (JD) and Resume.
2.  **Real-Time Audio:** Full-duplex audio pipeline. The user speaks, and the AI responds instantly with natural voice.
3.  **Visualizers:** Real-time audio visualization for both the user's mic and the AI's voice output.
4.  **Session Management:** Inactivity warnings and timeouts to manage costs.
5.  **Feedback System:** After the session ends, the AI generates structured feedback (Strengths/Improvement areas).

---

### **Implementation Plan**

Please generate the following file structure and contents:

#### **1. Project Configuration**

- `package.json` (Root): Scripts for `dev`, `build`. Dependencies: `react`, `react-dom`, `@google/genai`. DevDeps: `vite`, `tailwindcss`, `postcss`, `autoprefixer`.
- `server/package.json`: Dependencies: `express`, `ws`, `dotenv`, `cors`, `@google/genai`. DevDeps: `ts-node-dev`, `typescript`.
- `tsconfig.json`: Standard React + TypeScript configuration.
- `vite.config.ts`: Standard Vite + React plugin.
- `tailwind.config.js`: Enable standard content paths.

#### **2. Backend (`server/`)**

- **`server/constants.ts`**:
  - `INACTIVITY_WARNING_MS` (60s), `SESSION_TIMEOUT_MS` (60s).
  - `INPUT_SAMPLE_RATE` (16000), `OUTPUT_SAMPLE_RATE` (24000).
  - `MODEL_ID`: 'gemini-2.5-flash-native-audio-preview-12-2025'.
- **`server/index.ts`**:
  - Initialize Express and WebSocketServer on port 3001.
  - **WebSocket Logic:**
    - On `connection`: Initialize session state (timers, audio queue).
    - On `message` (JSON):
      - `INITIAL_SETUP`: Receive system instruction, connect to `ai.live.connect` with `responseModalities: [Modality.AUDIO]`. Use `Kore` voice.
      - `AUDIO`: Forward base64 PCM audio to Gemini using `sendRealtimeInput`.
      - `TEXT`: Send text to Gemini (for feedback requests).
    - **Gemini Callbacks:**
      - `onopen`: Process any queued audio.
      - `onmessage`: Relay audio chunks (`serverContent.modelTurn`) to client. Detect `generationComplete` to manage inactivity timers.
      - `onclose`: Clean up.

#### **3. Frontend (`src/`)**

- **`types.ts`**: Define `InterviewSetup` (jdText, resumeText, mode) and `Message` interfaces.
- **`lib/interviewPrompt.ts`**:
  - Export `generateInterviewPrompt(setup)`: Returns a system instruction string.
  - The prompt should define the AI as a professional interviewer who asks ONE question at a time, listens actively, and keeps responses concise.

- **`hooks/useLiveInterview.ts`**:
  - Manage WebSocket connection to `localhost:3001`.
  - **Audio Input:** Use `navigator.mediaDevices.getUserMedia` -> `ScriptProcessorNode` (or AudioWorklet) -> Downsample to 16kHz -> Base64 encode -> Send `AUDIO` message.
  - **Audio Output:** Receive data -> Decode Base64 -> Play using `AudioContext`.
  - **State:** `isConnecting`, `isAgentSpeaking`, `micLevel`.
  - **Cleanup:** robust cleanup of AudioContexts and WebSockets on unmount.

- **`components/SetupForm.tsx`**:
  - Two text areas: "Job Description" and "Resume".
  - **System Check:** A visual microphone test (using `AnalyserNode`) and a "Play Test Sound" button.
  - "Start Interview" button (disabled until inputs are filled).

- **`components/LiveInterview.tsx`**:
  - Display the active call interface.
  - Show a large, animated "orb" or waveform that reacts to `isAgentSpeaking`.
  - "End Interview" button: Triggers feedback generation.
  - Display transcript or status messages.

- **`app.tsx`**:
  - Main layout with a dark theme (bg-slate-900).
  - Switch between `SetupForm` and `LiveInterview` based on state.

---

### **Design Requirements**

- **Aesthetics:** Modern, "Dark Mode" premium feel. Use Slate/Indigo color palette (`bg-slate-900`, `text-slate-100`, `ring-indigo-500`).
- **Responsiveness:** Fully responsive for desktop and mobile.
- **UX:** clear distinct states for "Listening" vs "Speaking".

Please generate the complete codebase based on these specifications.
