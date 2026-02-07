import { render, screen, fireEvent } from '@testing-library/react';
import { SetupForm } from './SetupForm';
import { describe, it, expect, vi } from 'vitest';

describe('SetupForm', () => {
  it('renders the setup form', () => {
    render(<SetupForm onStart={vi.fn()} />);
    expect(screen.getByText(/Prepare Your Session/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Job Description URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete Setup to Start/i)).toBeDisabled();
  });

  it('enables the start button when requirements are met', () => {
    const onStart = vi.fn();
    render(<SetupForm onStart={onStart} />);
    
    const jdInput = screen.getByLabelText(/Job Description URL/i);
    const resumeInput = screen.getByLabelText(/Resume URL \(Optional\)/i);
    
    fireEvent.change(jdInput, { target: { value: 'https://example.com/job' } });
    fireEvent.change(resumeInput, { target: { value: 'https://example.com/resume' } });
    
    const startButton = screen.getByText(/Begin Deep-Dive Interview/i);
    expect(startButton).not.toBeDisabled();
    
    fireEvent.click(startButton);
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      jdUrl: 'https://example.com/job',
      resumeUrl: 'https://example.com/resume',
    }));
  });

  it('switches interview modes', () => {
    render(<SetupForm onStart={vi.fn()} />);
    
    const voiceMode = screen.getByText('Voice');
    const textMode = screen.getByText('Text');
    
    fireEvent.click(textMode);
    expect(textMode).toHaveClass('border-indigo-500');
    
    fireEvent.click(voiceMode);
    expect(voiceMode).toHaveClass('border-indigo-500');
  });
});
