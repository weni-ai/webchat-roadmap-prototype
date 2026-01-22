/**
 * MessageQueue - FIFO queue for messages sent before connection is established
 *
 * This queue temporarily stores messages that are sent via window.WebChat.send()
 * before the WebSocket connection is ready. Once connected, messages are
 * automatically flushed in the order they were received.
 *
 * Features:
 * - FIFO ordering (first in, first out)
 * - Max size protection (100 messages)
 * - Async flush with error handling
 * - Timestamp tracking for debugging
 */
class MessageQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.MAX_SIZE = 100;
  }

  /**
   * Add a message to the queue
   * @param {Object} message - Message object with text and optional metadata
   * @param {string} message.text - Message text content
   * @param {Object} [message.metadata] - Optional metadata object
   */
  enqueue(message) {
    // Overflow protection: drop oldest message if queue is full
    if (this.queue.length >= this.MAX_SIZE) {
      console.warn('WebChat: Message queue full, dropping oldest message');
      this.queue.shift();
    }

    this.queue.push({
      text: message.text,
      metadata: message.metadata || null,
      timestamp: Date.now(),
    });
  }

  /**
   * Flush all queued messages by calling the send function for each
   * @param {Function} sendFn - Async function to send a message, signature: (text, options) => Promise
   * @returns {Promise<void>}
   */
  async flush(sendFn) {
    if (this.isProcessing) {
      console.warn('WebChat: Queue flush already in progress');
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift();

        try {
          await sendFn(message.text, { metadata: message.metadata });
        } catch (error) {
          console.error('WebChat: Failed to send queued message:', error);
          // Continue with next message even if one fails
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear all queued messages
   */
  clear() {
    this.queue = [];
  }

  /**
   * Get the number of queued messages
   * @returns {number}
   */
  size() {
    return this.queue.length;
  }
}

export default MessageQueue;
