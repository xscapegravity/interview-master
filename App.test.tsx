import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './app';
import { describe, it, expect, vi } from 'vitest';

// Mock LiveInterview
vi.mock('./components/LiveInterview', () => ({
  LiveInterview: ({ onEnd }: { onEnd: () => void }) => (
    <div data-testid="live-interview">
      <button onClick={onEnd}>Mock End Session</button>
    </div>
  ),
}));

describe('App', () => {
  it('shows setup form by default and can start interview', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    expect(screen.getByText(/Prepare Your Session/i)).toBeInTheDocument();
    
    const jdInput = screen.getByLabelText(/Job Description URL/i);
    const resumeInput = screen.getByLabelText(/Resume URL \(Optional\)/i);
    
    await user.type(jdInput, 'https://example.com/job');
    await user.type(resumeInput, 'https://example.com/resume');
    
    const startButton = screen.getByText(/Begin Deep-Dive Interview/i);
    await user.click(startButton);
    
    expect(await screen.findByTestId('live-interview')).toBeInTheDocument();
  });

  it('can exit the interview and return to setup', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    await user.type(screen.getByLabelText(/Job Description URL/i), 'https://test.com');
    await user.type(screen.getByLabelText(/Resume URL \(Optional\)/i), 'https://test.com');
    await user.click(screen.getByText(/Begin Deep-Dive Interview/i));
    
    // Wait for interview to appear
    await screen.findByTestId('live-interview');
    
    // Header should now have Exit Interview
    const exitButton = screen.getByText('Exit Interview');
    await user.click(exitButton);
    
    // Should be back to setup
    expect(await screen.findByText(/Prepare Your Session/i)).toBeInTheDocument();
  });
});
