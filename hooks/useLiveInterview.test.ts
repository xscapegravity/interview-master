import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveInterview } from './useLiveInterview';
import { InterviewSetup } from '../types';

describe('useLiveInterview - WebSocket Connection', () => {
    let mockWebSocket: any;
    const originalLocation = window.location;

    beforeEach(() => {
        // Mock WebSocket
        mockWebSocket = {
            send: vi.fn(),
            close: vi.fn(),
            readyState: WebSocket.OPEN,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };

        global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket) as any;
        (global.WebSocket as any).OPEN = 1;

        // Mock window.location
        delete (window as any).location;
        window.location = { ...originalLocation, protocol: 'http:', host: 'localhost:3000' } as any;

        // Mock getUserMedia
        Object.defineProperty(global.navigator, 'mediaDevices', {
            value: {
                getUserMedia: vi.fn().mockResolvedValue({
                    getTracks: () => [],
                }),
            },
            writable: true
        });

        // Mock AudioContext
        global.AudioContext = vi.fn().mockImplementation(() => ({
            createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
            createScriptProcessor: vi.fn(() => ({ connect: vi.fn(), onaudioprocess: null })),
            createAnalyser: vi.fn(() => ({ 
                connect: vi.fn(), 
                frequencyBinCount: 128, 
                getByteFrequencyData: vi.fn() 
            })),
            destination: {},
            state: 'running',
            close: vi.fn(),
        })) as any;
    });

    afterEach(() => {
        window.location = originalLocation as any;
        vi.clearAllMocks();
    });

    it('should connect to ws:// protocol when on http', async () => {
        window.location.protocol = 'http:';
        window.location.host = 'localhost:3000';

        const setup: InterviewSetup = {
            jdUrl: 'http://example.com',
            resumeUrl: 'http://example.com',
            jdText: 'Software Engineer',
            resumeText: 'Experienced Developer',
            mode: 'text'
        };

        renderHook(() => useLiveInterview(setup));

        // Wait for effect
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000');
    });

    it('should connect to wss:// protocol when on https', async () => {
        window.location.protocol = 'https:';
        window.location.host = 'interview-master.uk.r.appspot.com';

        const setup: InterviewSetup = {
            jdUrl: 'http://example.com',
            resumeUrl: 'http://example.com',
            jdText: 'Software Engineer',
            resumeText: 'Experienced Developer',
            mode: 'text'
        };

        renderHook(() => useLiveInterview(setup));

        // Wait for effect
        await act(async () => {
             await new Promise(resolve => setTimeout(resolve, 50));
        });

        expect(global.WebSocket).toHaveBeenCalledWith('wss://interview-master.uk.r.appspot.com');
    });
});
