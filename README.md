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

#### Running Locally

1. Install dependencies:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```
2. Start the backend server:
   ```bash
   cd server && npm run dev
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```

## Testing

The project includes both frontend unit tests and backend integration tests.

- **Run Frontend Tests**: `npm test`
- **Run Backend Integration Tests**: `npm run test:server`
  - _Note: Backend tests require a valid `API_KEY` in the `server/.env` file._

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
