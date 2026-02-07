# Gemini Interview Master

A professional AI-powered interview agent that conducts deep-dive behavioral interviews using the Gemini 2.5 Live API for real-time voice and text interaction.

## Features

- **Real-time Voice & Text Interaction**: Experience natural, low-latency conversations with a sophisticated interviewer.
- **Job & Resume Context**: Analyzes your provided Job Description and Resume to ask tailored, insightful questions.
- **Audio System Check**: Built-in microphone visualizer and speaker test to ensure you're ready before the interview begins.
- **Session Transcripts**: Automatically logs the entire conversation, with the option to download it as a text file at the end of the session.
- **Privacy Centric**: Runs entirely in your browser using client-side SDKs.

## Getting Started

### Prerequisites

- A [Gemini API Key](https://aistudio.google.com/app/apikey).
- A local web server (e.g., [VS Code Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or `npx serve`).

### Running Locally

1. Clone or download the source code to your local machine.
2. Ensure you are serving the project from a local web server (the API requires a secure context or localhost for microphone access).
3. The application uses the `process.env.API_KEY` for authentication. If you are using a standard development environment, ensure this is injected.

## Project Structure

- `App.tsx`: The main application shell and state management.
- `components/SetupForm.tsx`: Handles input for Job Descriptions, Resumes, and audio diagnostics.
- `components/LiveInterview.tsx`: Manages the real-time WebSocket connection to the Gemini Live API and handles audio streaming.
- `types.ts`: TypeScript definitions for the application state.
- `index.html`: Entry point with Tailwind CSS and ESM import maps for a buildless experience.

## Technical Stack

- **Frontend**: React (v19) & TypeScript.
- **Styling**: Tailwind CSS for a modern, responsive UI.
- **AI Engine**: [Google Gemini 2.5 Live API](https://ai.google.dev/).
- **Module Management**: Native ES Modules via `esm.sh`.

## License

MIT
