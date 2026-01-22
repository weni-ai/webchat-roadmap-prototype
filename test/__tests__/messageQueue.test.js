/**
 * @jest-environment jsdom
 */

import MessageQueue from '@/utils/messageQueue';

describe('MessageQueue', () => {
  let queue;
  let consoleSpy;

  beforeEach(() => {
    queue = new MessageQueue();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('enqueue', () => {
    it('should add message to queue', () => {
      queue.enqueue({ text: 'Hello', metadata: null });

      expect(queue.size()).toBe(1);
    });

    it('should preserve message text and metadata', () => {
      const message = { text: 'Test', metadata: { source: 'button' } };
      queue.enqueue(message);

      const queuedMessage = queue.queue[0];
      expect(queuedMessage.text).toBe('Test');
      expect(queuedMessage.metadata).toEqual({ source: 'button' });
      expect(queuedMessage.timestamp).toBeDefined();
    });

    it('should add multiple messages in order', () => {
      queue.enqueue({ text: 'First', metadata: null });
      queue.enqueue({ text: 'Second', metadata: null });
      queue.enqueue({ text: 'Third', metadata: null });

      expect(queue.size()).toBe(3);
      expect(queue.queue[0].text).toBe('First');
      expect(queue.queue[1].text).toBe('Second');
      expect(queue.queue[2].text).toBe('Third');
    });

    it('should handle null metadata', () => {
      queue.enqueue({ text: 'Test', metadata: null });

      expect(queue.queue[0].metadata).toBeNull();
    });

    it('should handle undefined metadata', () => {
      queue.enqueue({ text: 'Test' });

      expect(queue.queue[0].metadata).toBeNull();
    });
  });

  describe('overflow protection', () => {
    it('should drop oldest message when queue exceeds max size', () => {
      // Fill queue to max (100 messages)
      for (let i = 0; i < 100; i++) {
        queue.enqueue({ text: `Message ${i}`, metadata: null });
      }

      expect(queue.size()).toBe(100);
      expect(consoleSpy).not.toHaveBeenCalled();

      // Add 101st message - should drop oldest
      queue.enqueue({ text: 'Message 100', metadata: null });

      expect(queue.size()).toBe(100);
      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat: Message queue full, dropping oldest message',
      );
      expect(queue.queue[0].text).toBe('Message 1'); // 'Message 0' was dropped
      expect(queue.queue[99].text).toBe('Message 100');
    });
  });

  describe('flush', () => {
    it('should flush all messages in FIFO order', async () => {
      queue.enqueue({ text: 'First', metadata: null });
      queue.enqueue({ text: 'Second', metadata: null });
      queue.enqueue({ text: 'Third', metadata: null });

      const sendFn = jest.fn().mockResolvedValue(undefined);

      await queue.flush(sendFn);

      expect(sendFn).toHaveBeenCalledTimes(3);
      expect(sendFn).toHaveBeenNthCalledWith(1, 'First', { metadata: null });
      expect(sendFn).toHaveBeenNthCalledWith(2, 'Second', { metadata: null });
      expect(sendFn).toHaveBeenNthCalledWith(3, 'Third', { metadata: null });
      expect(queue.size()).toBe(0);
    });

    it('should pass metadata to send function', async () => {
      queue.enqueue({ text: 'Test', metadata: { key: 'value' } });

      const sendFn = jest.fn().mockResolvedValue(undefined);

      await queue.flush(sendFn);

      expect(sendFn).toHaveBeenCalledWith('Test', { metadata: { key: 'value' } });
    });

    it('should continue flushing if one message fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      queue.enqueue({ text: 'First', metadata: null });
      queue.enqueue({ text: 'Second', metadata: null });
      queue.enqueue({ text: 'Third', metadata: null });

      const sendFn = jest
        .fn()
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Network error')) // Second fails
        .mockResolvedValueOnce(undefined); // Third succeeds

      await queue.flush(sendFn);

      expect(sendFn).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'WebChat: Failed to send queued message:',
        expect.any(Error),
      );
      expect(queue.size()).toBe(0); // All messages removed even if one failed

      consoleErrorSpy.mockRestore();
    });

    it('should not flush if already processing', async () => {
      queue.enqueue({ text: 'Test', metadata: null });

      const sendFn = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      // Start first flush (won't complete immediately)
      const firstFlush = queue.flush(sendFn);

      // Try second flush immediately (should be ignored)
      await queue.flush(sendFn);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebChat: Queue flush already in progress',
      );

      // Wait for first flush to complete
      await firstFlush;

      expect(sendFn).toHaveBeenCalledTimes(1); // Only first flush executed
    });

    it('should handle empty queue', async () => {
      const sendFn = jest.fn();

      await queue.flush(sendFn);

      expect(sendFn).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all messages', () => {
      queue.enqueue({ text: 'First', metadata: null });
      queue.enqueue({ text: 'Second', metadata: null });
      queue.enqueue({ text: 'Third', metadata: null });

      expect(queue.size()).toBe(3);

      queue.clear();

      expect(queue.size()).toBe(0);
    });

    it('should clear empty queue without error', () => {
      expect(queue.size()).toBe(0);

      queue.clear();

      expect(queue.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.size()).toBe(0);
    });

    it('should return correct size after enqueue', () => {
      queue.enqueue({ text: 'Test', metadata: null });
      expect(queue.size()).toBe(1);

      queue.enqueue({ text: 'Test 2', metadata: null });
      expect(queue.size()).toBe(2);
    });

    it('should return correct size after flush', async () => {
      queue.enqueue({ text: 'Test', metadata: null });
      queue.enqueue({ text: 'Test 2', metadata: null });

      expect(queue.size()).toBe(2);

      const sendFn = jest.fn().mockResolvedValue(undefined);
      await queue.flush(sendFn);

      expect(queue.size()).toBe(0);
    });
  });
});
