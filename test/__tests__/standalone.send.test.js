/**
 * @jest-environment jsdom
 */

// Mock the dependencies before importing standalone
jest.mock('@/contexts/ChatContext', () => ({
  service: {
    onReady: jest.fn(),
    fns: [],
  },
}));

jest.mock('@/components/Widget/Widget', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock MessageQueue
jest.mock('@/utils/messageQueue', () => {
  return jest.fn().mockImplementation(() => ({
    enqueue: jest.fn(),
    flush: jest.fn(),
    clear: jest.fn(),
    size: jest.fn(() => 0),
    queue: [],
  }));
});

describe('WebChat.send()', () => {
  let WebChat;
  let consoleSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();

    // Setup console spies
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock DOM
    document.body.innerHTML = '<div id="webchat"></div>';

    // Import after mocks are set up
    WebChat = require('@/standalone').default;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    document.body.innerHTML = '';
  });

  describe('lifecycle validation', () => {
    it('should error when called before init()', async () => {
      await WebChat.send('Hello');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'WebChat.send(): Widget not initialized. Call init() first.',
      );
    });

    it('should error when called after destroy()', async () => {
      // Initialize first
      WebChat.init({
        selector: '#webchat',
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      });

      // Destroy
      WebChat.destroy();

      // Try to send
      await WebChat.send('Hello');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'WebChat.send(): Widget not initialized. Call init() first.',
      );
    });
  });

  describe('validation - invalid inputs', () => {
    beforeEach(() => {
      // Initialize widget for validation tests
      WebChat.init({
        selector: '#webchat',
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      });
    });

    it('should reject null with warning', async () => {
      await WebChat.send(null);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Message cannot be null or undefined',
      );
    });

    it('should reject undefined with warning', async () => {
      await WebChat.send(undefined);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Message cannot be null or undefined',
      );
    });

    it('should reject empty string with warning', async () => {
      await WebChat.send('');

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Message text cannot be empty',
      );
    });

    it('should reject whitespace-only string with warning', async () => {
      await WebChat.send('   ');

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Message text cannot be empty',
      );
    });

    it('should reject number with warning', async () => {
      await WebChat.send(123);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Invalid message format. Expected string or { text: string, metadata?: object }',
      );
    });

    it('should reject boolean with warning', async () => {
      await WebChat.send(true);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Invalid message format. Expected string or { text: string, metadata?: object }',
      );
    });

    it('should reject array with warning', async () => {
      await WebChat.send(['message']);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Invalid message format. Expected string or { text: string, metadata?: object }',
      );
    });

    it('should reject object without text field', async () => {
      await WebChat.send({ content: 'Hello' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Invalid message format. Expected string or { text: string, metadata?: object }',
      );
    });

    it('should reject object with empty text', async () => {
      await WebChat.send({ text: '' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Message text cannot be empty',
      );
    });

    it('should reject object with whitespace-only text', async () => {
      await WebChat.send({ text: '   ' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Message text cannot be empty',
      );
    });

    it('should truncate message exceeding 10,000 characters', async () => {
      const longMessage = 'A'.repeat(10001);

      // Mock service to avoid actual send
      const mockService = {
        getSession: jest.fn(() => ({ isChatOpen: true })),
        setIsChatOpen: jest.fn(),
        getState: jest.fn(() => ({ connection: { status: 'connected' } })),
        sendMessage: jest.fn(),
      };

      // Mock serviceWhenReady to return our mock service
      const { service } = require('@/contexts/ChatContext');
      service.onReady = jest.fn().mockResolvedValue(mockService);

      await WebChat.send(longMessage);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat.send(): Message exceeds maximum length of 10000 characters. Truncating.',
      );
    });
  });

  describe('validation - valid inputs', () => {
    beforeEach(() => {
      WebChat.init({
        selector: '#webchat',
        socketUrl: 'wss://test.com',
        channelUuid: 'test-uuid',
        host: 'https://test.com',
      });
    });

    it('should accept string message', async () => {
      const mockService = {
        getSession: jest.fn(() => ({ isChatOpen: true })),
        setIsChatOpen: jest.fn(),
        getState: jest.fn(() => ({ connection: { status: 'connected' } })),
        sendMessage: jest.fn(),
      };

      const { service } = require('@/contexts/ChatContext');
      service.onReady = jest.fn().mockResolvedValue(mockService);

      await WebChat.send('Hello');

      expect(mockService.sendMessage).toHaveBeenCalledWith('Hello', {
        metadata: null,
      });
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should accept object with text', async () => {
      const mockService = {
        getSession: jest.fn(() => ({ isChatOpen: true })),
        setIsChatOpen: jest.fn(),
        getState: jest.fn(() => ({ connection: { status: 'connected' } })),
        sendMessage: jest.fn(),
      };

      const { service } = require('@/contexts/ChatContext');
      service.onReady = jest.fn().mockResolvedValue(mockService);

      await WebChat.send({ text: 'Hello' });

      expect(mockService.sendMessage).toHaveBeenCalledWith('Hello', {
        metadata: null,
      });
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should accept object with text and metadata', async () => {
      const mockService = {
        getSession: jest.fn(() => ({ isChatOpen: true })),
        setIsChatOpen: jest.fn(),
        getState: jest.fn(() => ({ connection: { status: 'connected' } })),
        sendMessage: jest.fn(),
      };

      const { service } = require('@/contexts/ChatContext');
      service.onReady = jest.fn().mockResolvedValue(mockService);

      await WebChat.send({ text: 'Hello', metadata: { source: 'button' } });

      expect(mockService.sendMessage).toHaveBeenCalledWith('Hello', {
        metadata: { source: 'button' },
      });
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should accept unicode and emojis', async () => {
      const mockService = {
        getSession: jest.fn(() => ({ isChatOpen: true })),
        setIsChatOpen: jest.fn(),
        getState: jest.fn(() => ({ connection: { status: 'connected' } })),
        sendMessage: jest.fn(),
      };

      const { service } = require('@/contexts/ChatContext');
      service.onReady = jest.fn().mockResolvedValue(mockService);

      await WebChat.send('Hello 你好 🎉');

      expect(mockService.sendMessage).toHaveBeenCalledWith('Hello 你好 🎉', {
        metadata: null,
      });
    });

    it('should accept message at max length (10,000 chars)', async () => {
      const maxMessage = 'A'.repeat(10000);

      const mockService = {
        getSession: jest.fn(() => ({ isChatOpen: true })),
        setIsChatOpen: jest.fn(),
        getState: jest.fn(() => ({ connection: { status: 'connected' } })),
        sendMessage: jest.fn(),
      };

      const { service } = require('@/contexts/ChatContext');
      service.onReady = jest.fn().mockResolvedValue(mockService);

      await WebChat.send(maxMessage);

      expect(mockService.sendMessage).toHaveBeenCalledWith(maxMessage, {
        metadata: null,
      });
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
