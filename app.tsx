
import React, { useState, useCallback } from 'react';
import { SetupForm } from './components/SetupForm';
import { LiveInterview } from './components/LiveInterview';
import { InterviewSetup } from './types';

function App() {
  const [setup, setSetup] = useState<InterviewSetup | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const handleStartInterview = useCallback((data: InterviewSetup) => {
    setSetup(data);
    setIsStarted(true);
  }, []);

  const handleReset = useCallback(() => {
    setSetup(null);
    setIsStarted(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Interview<span className="text-indigo-400">Master</span></h1>
          </div>
          {isStarted && (
            <button
              onClick={handleReset}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Exit Interview
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-4 md:p-8">
        {!isStarted ? (
          <SetupForm onStart={handleStartInterview} />
        ) : (
          <div className="w-full max-w-7xl flex-1 flex flex-col min-h-0">
            {setup && <LiveInterview setup={setup} onEnd={handleReset} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 py-4 text-center text-slate-500 text-sm border-t border-slate-800">
        &copy; {new Date().getFullYear()} InterviewMaster AI • Powered by Gemini 2.5
      </footer>
    </div>
  );
}

export default App;
