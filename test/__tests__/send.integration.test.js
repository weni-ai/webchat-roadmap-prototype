/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import Widget from '@/components/Widget/Widget';

// Mock the WebChat service
const mockSendMessage = jest.fn();
const mockSetIsChatOpen = jest.fn();
const mockGetState = jest.fn();
const mockGetSession = jest.fn();
const mockOn = jest.fn();

jest.mock('@weni/webchat-service', () => {
  return jest.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
    setIsChatOpen: mockSetIsChatOpen,
    getState: mockGetState,
    getSession: mockGetSession,
    on: mockOn,
    init: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    getMessages: jest.fn(() => []),
    isAudioRecordingSupported: false,
    getFileConfig: jest.fn(() => ({})),
  }));
});

describe('WebChat.send() Integration Tests', () => {
  let container;

  beforeEach(() => {
    // Reset mocks
    mockSendMessage.mockClear();
    mockSetIsChatOpen.mockClear();
    mockGetState.mockClear();
    mockGetSession.mockClear();
    mockOn.mockClear();

    // Setup default mock returns
    mockGetSession.mockReturnValue({ isChatOpen: false });
    mockGetState.mockReturnValue({ connection: { status: 'connected' } });

    // Create container
    container = document.createElement('div');
    container.id = 'webchat-test';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('auto-open chat behavior', () => {
    it('should open chat when sending message while closed', async () => {
      const config = {
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      };

      render(<Widget config={config} />, { container });

      // Wait for widget to initialize
      await waitFor(() => {
        expect(mockOn).toHaveBeenCalled();
      });

      // Get the service instance from ChatContext
      const { service } = require('@/contexts/ChatContext');

      // Simulate send call
      const { default: WebChat } = require('@/standalone');

      // Mock that chat is closed
      mockGetSession.mockReturnValue({ isChatOpen: false });
      mockGetState.mockReturnValue({ connection: { status: 'connected' } });

      // Ensure service is ready
      if (service.onReady) {
        await service.onReady();
      }

      // Send message
      await WebChat.send('Test message');

      // Should open chat
      await waitFor(() => {
        expect(mockSetIsChatOpen).toHaveBeenCalledWith(true);
      });

      // Should send message
      expect(mockSendMessage).toHaveBeenCalledWith('Test message', {
        metadata: null,
      });
    });

    it('should not toggle chat state if already open', async () => {
      const config = {
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      };

      render(<Widget config={config} />, { container });

      await waitFor(() => {
        expect(mockOn).toHaveBeenCalled();
      });

      const { service } = require('@/contexts/ChatContext');
      const { default: WebChat } = require('@/standalone');

      // Mock that chat is already open
      mockGetSession.mockReturnValue({ isChatOpen: true });
      mockGetState.mockReturnValue({ connection: { status: 'connected' } });

      if (service.onReady) {
        await service.onReady();
      }

      await WebChat.send('Test message');

      // Should not call setIsChatOpen since already open
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });

      expect(mockSetIsChatOpen).not.toHaveBeenCalled();
    });
  });

  describe('message sending flow', () => {
    it('should send message immediately when connected', async () => {
      const config = {
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      };

      render(<Widget config={config} />, { container });

      await waitFor(() => {
        expect(mockOn).toHaveBeenCalled();
      });

      const { service } = require('@/contexts/ChatContext');
      const { default: WebChat } = require('@/standalone');

      mockGetSession.mockReturnValue({ isChatOpen: true });
      mockGetState.mockReturnValue({ connection: { status: 'connected' } });

      if (service.onReady) {
        await service.onReady();
      }

      await WebChat.send('Test message');

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Test message', {
          metadata: null,
        });
      });
    });

    it('should send message with metadata', async () => {
      const config = {
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      };

      render(<Widget config={config} />, { container });

      await waitFor(() => {
        expect(mockOn).toHaveBeenCalled();
      });

      const { service } = require('@/contexts/ChatContext');
      const { default: WebChat } = require('@/standalone');

      mockGetSession.mockReturnValue({ isChatOpen: true });
      mockGetState.mockReturnValue({ connection: { status: 'connected' } });

      if (service.onReady) {
        await service.onReady();
      }

      const metadata = { source: 'button', page: '/pricing' };
      await WebChat.send({ text: 'Help needed', metadata });

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Help needed', { metadata });
      });
    });
  });

  describe('rapid successive sends', () => {
    it('should handle multiple rapid sends without loss', async () => {
      const config = {
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      };

      render(<Widget config={config} />, { container });

      await waitFor(() => {
        expect(mockOn).toHaveBeenCalled();
      });

      const { service } = require('@/contexts/ChatContext');
      const { default: WebChat } = require('@/standalone');

      mockGetSession.mockReturnValue({ isChatOpen: true });
      mockGetState.mockReturnValue({ connection: { status: 'connected' } });

      if (service.onReady) {
        await service.onReady();
      }

      // Send 10 messages rapidly
      const messages = [];
      for (let i = 0; i < 10; i++) {
        messages.push(WebChat.send(`Message ${i}`));
      }

      // Wait for all to complete
      await Promise.all(messages);

      // All should be sent
      expect(mockSendMessage).toHaveBeenCalledTimes(10);

      // Verify order
      for (let i = 0; i < 10; i++) {
        expect(mockSendMessage).toHaveBeenNthCalledWith(
          i + 1,
          `Message ${i}`,
          { metadata: null },
        );
      }
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      const config = {
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      };

      render(<Widget config={config} />, { container });

      await waitFor(() => {
        expect(mockOn).toHaveBeenCalled();
      });

      const { service } = require('@/contexts/ChatContext');
      const { default: WebChat } = require('@/standalone');

      mockGetSession.mockReturnValue({ isChatOpen: true });
      mockGetState.mockReturnValue({ connection: { status: 'connected' } });
      mockSendMessage.mockRejectedValue(new Error('Network error'));

      if (service.onReady) {
        await service.onReady();
      }

      await WebChat.send('Test message');

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'WebChat.send(): Failed to send message:',
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
