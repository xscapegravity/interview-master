# Project Requirements Document (PRD): Interview Master

**Version:** 1.0
**Date:** 2026-02-09
**Status:** Approved

---

## 1. Executive Summary

**Interview Master** is a real-time, voice-based technical interview simulation application. It leverages **Google's Gemini Multimodal Live API** to provide users with a lifelike interview experience. The system acts as a "Senior Technical Interviewer", customizing the session based on the user's resume and a target job description. The goal is to provide a low-latency, immersive practice environment with actionable feedback.

## 2. Objectives

- **Realistic Simulation:** Create a voice-first interaction that mimics a real human interviewer's pacing and tone.
- **Low Latency:** Utilize WebSockets and Gemini's streaming capabilities to minimize conversational delay.
- **Customization:** Ensure every interview is unique and relevant to the user's specific career goals (via Resume/JD injection).
- **Actionable Feedback:** Provide structured insights (Strengths/Weaknesses) immediately after the session.

## 3. Target Audience

- Taget Audience is dependent and relevant to the resume/JD injection.
- Job seekers looking to practice behavioral and technical questions in a low-pressure environment.

---

## 4. Master Generation Prompt

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

## 5. Functional Requirements

### 5.1. Onboarding & Setup

- **Input Form:** Users must be able to paste text for:
  - **Job Description (JD):** Context for the role.
  - **Resume:** Context for the candidate's background.
- **System Check:**
  - **Microphone Test:** Visual feedback (meter) to confirm audio input is working.
  - **Speaker Test:** "Play Sound" button to confirm audio output is working.
- **Start Condition:** The interview cannot begin until both JD and Resume are provided.

### 5.2. Live Interview Session

- **Audio Interaction:**
  - Full-duplex audio: Users can speak freely.
  - Interruptibility: The system should handle interruptions gracefully (clearing audio buffers if the user cuts in - _feature of Gemini API_).
- **Visual Interface:**
  - **User Visualizer:** Real-time waveform or bar graph showing the user's mic input.
  - **Agent Visualizer:** "Orb" or waveform animation that reacts specifically to the AI's voice amplitude.
- **Controls:**
  - "End Interview" button to voluntarily terminate the session and request feedback.
  - "Exit" button to return to setup without feedback.

### 5.3. Session Management

- **Inactivity Warning:** If no audio is detected from the user for **20 seconds**, verbally ask the user if they are still there and if they wish to proceed.
- **Session Timeout:** If no response occurs for another **10 seconds** (30s total), automatically close the connection to save resources.

### 5.4. Post-Interview Feedback

- **Trigger:** Activated automatically when the user clicks "End Interview".
- **Mechanism:** The backend sends a specific prompt to Gemini to shift context from "Interviewer" to "Evaluator".
- **Output:** Structured text displaying:
  - 2 Key Strengths.
  - 2 Areas for Improvement.

---

## 6. Technical Architecture

### 6.1. Technology Stack

- **Frontend:**
  - **Framework:** React 19 (via Vite)
  - **Language:** TypeScript
  - **Styling:** Tailwind CSS (Dark Mode, Slate/Indigo palette)
  - **Icons:** Lucide React
- **Backend:**
  - **Runtime:** Node.js
  - **Server:** Express
  - **Protocol:** WebSockets (`ws` library) for real-time streaming.
  - **AI Integration:** `@google/genai` SDK.

### 6.2. Data Flow

1.  **Initialization:** Client sends `INITIAL_SETUP` (System Instruction) -> Server connects to Gemini Live API.
2.  **Audio Upstream:** Browser `MediaStream` -> Downsampled to 16kHz PCM -> WebSocket -> Server -> Gemini `sendRealtimeInput`.
3.  **Audio Downstream:** Gemini `modelTurn` -> Server -> WebSocket -> Client -> Decoded -> Played via `AudioContext`.

### 6.3. Audio Specifications

- **Input (Microphone):** 16kHz sample rate, Mono, PCM (Base64 encoded for transport).
- **Output (AI Voice):** 24kHz sample rate, PCM.
- **Voice Configuration:** Pre-built voice `Kore` (or similar professional voice).

---

## 7. User Interface (UI) & Experience (UX) Settings

### 7.1. Design Language

- **Theme:** "Premium Dark Mode".
  - Backgrounds: `bg-slate-900`, `bg-slate-800`.
  - Accents: `indigo-500` (Primary), `indigo-400` (Text/Glows).
  - Text: `text-slate-100` (Primary), `text-slate-400` (Secondary).
- **Animations:**
  - Smooth transitions between Setup and Interview views.
  - "Breathing" or "Pulse" animations for the AI avatar/orb.

---

## 8. Project Structure & Deliverables

### 8.1. File Structure

- **Root:** `package.json`, `vite.config.ts`, `tsconfig.json`.
- **Server (`/server`):**
  - `index.ts`: Main entry point, WebSocket logic.
  - `constants.ts`: Config (Timeouts, Model IDs).
- **Client (`/src`):**
  - `app.tsx`: Main router/layout.
  - `hooks/useLiveInterview.ts`: Core logic for WebSocket/Audio binding.
  - `components/SetupForm.tsx`: Input and System Check.
  - `components/LiveInterview.tsx`: Active session UI.
  - `lib/interviewPrompt.ts`: Dynamic prompt generation logic.

### 8.2. Roadmap / Implementation Steps

1.  **Foundation:** Set up Monorepo-like structure (Root Frontend + Server folder).
2.  **Backend Core:** Implement basic WebSocket server and Gemini connectivity.
3.  **Frontend Logic:** Build `useLiveInterview` hook for audio streaming/processing.
4.  **UI Construction:** Build `SetupForm` and `LiveInterview` components with Tailwind.
5.  **Integration:** Connect Frontend audio pipeline to Backend WebSocket.
6.  **Refinement:** Tune audio visualizers and implement Inactivity Timers.
7.  **Final Polish:** Add Feedback mode and error handling.
