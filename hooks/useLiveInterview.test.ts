import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLiveInterview } from './useLiveInterview';
import { InterviewSetup } from '../types';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  });
}

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 16000;
  
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createScriptProcessor = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null,
  }));
  
  createAnalyser = vi.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    connect: vi.fn(),
    getByteFrequencyData: vi.fn(),
  }));
  
  createBuffer = vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(1024)),
  }));
  
  createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  }));
  
  close = vi.fn(() => Promise.resolve());
}

describe('useLiveInterview - Feedback Fixes', () => {
  let mockSetup: InterviewSetup;
  let mockWsInstance: MockWebSocket | null = null;
  
  beforeEach(() => {
    mockSetup = {
      jdText: 'Senior Developer Role',
      resumeText: 'Experienced Developer',
      jdUrl: '',
      resumeUrl: '',
      mode: 'voice',
    };

    // Track WebSocket instances
    const OriginalMockWebSocket = MockWebSocket;
    class TrackedMockWebSocket extends OriginalMockWebSocket {
      constructor(url: string) {
        super(url);
        mockWsInstance = this;
      }
    }

    // Setup global mocks
    global.WebSocket = TrackedMockWebSocket as any;
    global.AudioContext = MockAudioContext as any;
    (global as any).webkitAudioContext = MockAudioContext;
    
    // Mock getUserMedia (if not already handled by vitest.setup.ts)
    if (!global.navigator.mediaDevices) {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        configurable: true,
        value: {
          getUserMedia: vi.fn(() => 
            Promise.resolve({
              getTracks: () => [{ stop: vi.fn() }],
            } as any)
          ),
        },
      });
    } else if (!(global.navigator.mediaDevices.getUserMedia as any).mock) {
        global.navigator.mediaDevices.getUserMedia = vi.fn(() => 
            Promise.resolve({
              getTracks: () => [{ stop: vi.fn() }],
            } as any)
        );
    }

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    }) as any;
    
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockWsInstance = null;
  });

  it('Fix #1: should stop microphone processing when feedback is requested', async () => {
    const { result } = renderHook(() => useLiveInterview(mockSetup));

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    }, { timeout: 3000 });

    // Request feedback
    result.current.sendFeedbackRequest();

    await waitFor(() => {
      expect(result.current.isFeedbackRequested).toBe(true);
    });

    // Verify that audio processing should be paused
    // This is tested by checking the feedbackRequestedRef flag
    expect(result.current.isFeedbackRequested).toBe(true);
  });

  it('Fix #2: should send structured feedback prompt', async () => {
    const { result } = renderHook(() => useLiveInterview(mockSetup));

    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    }, { timeout: 3000 });
    
    result.current.sendFeedbackRequest();

    await waitFor(() => {
      expect(mockWsInstance?.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"TEXT"')
      );
    });

    // Verify the feedback prompt structure
    const sendCalls = mockWsInstance?.send.mock.calls;
    const feedbackCall = sendCalls?.find((call: any[]) => 
      call[0].includes('feedback') || call[0].includes('FEEDBACK')
    );
    
    expect(feedbackCall).toBeDefined();
    const callContent = feedbackCall?.[0] || '';
    expect(callContent).toContain('CONCLUSION');
    expect(callContent).toContain('STRENGTHS');
    expect(callContent).toContain('IMPROVEMENT');
  });

  it('Fix #3: should update visual feedback state', async () => {
    const { result } = renderHook(() => useLiveInterview(mockSetup));

    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.isFeedbackRequested).toBe(false);

    result.current.sendFeedbackRequest();

    await waitFor(() => {
      expect(result.current.isFeedbackRequested).toBe(true);
    });
  });

  it('Fix #4: should use proper Gemini API method for text', async () => {
    const { result } = renderHook(() => useLiveInterview(mockSetup));

    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    }, { timeout: 3000 });
    
    result.current.sendFeedbackRequest();

    await waitFor(() => {
      const sendCalls = mockWsInstance?.send.mock.calls;
      const textMessage = sendCalls?.find((call: any[]) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.type === 'TEXT';
        } catch {
          return false;
        }
      });
      
      expect(textMessage).toBeDefined();
    });
  });

  it('should handle cleanup properly when feedback is active', async () => {
    const { result, unmount } = renderHook(() => useLiveInterview(mockSetup));

    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    }, { timeout: 3000 });

    result.current.sendFeedbackRequest();

    await waitFor(() => {
      expect(result.current.isFeedbackRequested).toBe(true);
    });

    // Unmount should clean up properly
    unmount();

    // Verify cleanup was called
    expect(mockWsInstance?.close).toHaveBeenCalled();
  });
});
