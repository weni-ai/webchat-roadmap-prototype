/**
 * Standalone entry point for script tag usage
 * This file provides WebChat.init() method for backward compatibility
 * with the old weni-webchannel usage pattern
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

import Widget from './components/Widget/Widget';
import { service, resetServiceInstance } from './contexts/ChatContext';
import MessageQueue from './utils/messageQueue';
import './styles/index.scss';
import './i18n';

let widgetInstance = null;
let messageQueue = new MessageQueue();
let queueFlushListener = null; // Track the listener for cleanup

async function serviceWhenReady(timeoutMs = 10000) {
  if (typeof service.onReady === 'function') {
    // Add timeout to prevent waiting forever
    return await Promise.race([
      service.onReady(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Service ready timeout')), timeoutMs),
      ),
    ]);
  } else {
    return service;
  }
}

/**
 * Extract theme properties from params
 * Separates visual customization from functional config
 * Handles both direct properties and customizeWidget (push-webchat legacy)
 */
function extractThemeFromParams(params) {
  // Get customizeWidget object (legacy format)
  const customize = params.customizeWidget || {};

  // Helper to get value from customizeWidget first, then params (for flexibility)
  const getValue = (key) => customize[key] ?? params[key];

  const themeProps = {
    // Colors - Header
    titleColor: getValue('titleColor'),
    subtitleColor: getValue('subtitleColor'),
    headerBackgroundColor: getValue('headerBackgroundColor'),

    // Colors - Chat
    chatBackgroundColor: getValue('chatBackgroundColor'),

    // Colors - Launcher
    launcherColor: getValue('launcherColor') || getValue('mainColor'),
    mainColor: getValue('mainColor'),

    // Colors - Input
    inputBackgroundColor: getValue('inputBackgroundColor'),
    inputFontColor: getValue('inputFontColor'),
    inputPlaceholderColor: getValue('inputPlaceholderColor'),

    // Colors - Messages
    userMessageBubbleColor: getValue('userMessageBubbleColor'),
    userMessageTextColor: getValue('userMessageTextColor'),
    botMessageBubbleColor: getValue('botMessageBubbleColor'),
    botMessageTextColor: getValue('botMessageTextColor'),
    fullScreenBotMessageBubbleColor: getValue(
      'fullScreenBotMessageBubbleColor',
    ),

    // Colors - Quick Replies
    quickRepliesFontColor: getValue('quickRepliesFontColor'),
    quickRepliesBackgroundColor: getValue('quickRepliesBackgroundColor'),
    quickRepliesBorderColor: getValue('quickRepliesBorderColor'),
    quickRepliesBorderWidth: getValue('quickRepliesBorderWidth'),

    // Colors - Suggestions
    suggestionsBackgroundColor: getValue('suggestionsBackgroundColor'),
    suggestionsSeparatorColor: getValue('suggestionsSeparatorColor'),
    suggestionsFontColor: getValue('suggestionsFontColor'),
    suggestionsHoverFontColor: getValue('suggestionsHoverFontColor'),

    // Dimensions
    widgetHeight: getValue('widgetHeight'),
    widgetWidth: getValue('widgetWidth'),
    launcherHeight: getValue('launcherHeight'),
    launcherWidth: getValue('launcherWidth'),
  };

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(themeProps).filter(([_, value]) => value !== undefined),
  );
}

/**
 * Map old params to new config format
 * Ensures backward compatibility with push-webchat
 */
function mapConfig(params) {
  const config = {
    // Required properties
    socketUrl: params.socketUrl,
    channelUuid: params.channelUuid,
    host: params.host,

    // Connection settings
    connectOn: params.connectOn || 'mount',
    storage: params.params?.storage || 'local',
    initPayload: params.initPayload,
    sessionId: params.sessionId,
    sessionToken: params.sessionToken,
    customData: params.customData,
    hideWhenNotConnected: params.hideWhenNotConnected,
    autoClearCache: params.autoClearCache,
    contactTimeout: params.contactTimeout,

    // UI settings
    title: params.title || 'Welcome',
    subtitle: params.subtitle,
    inputTextFieldHint: params.inputTextFieldHint || 'Type a message',
    embedded: params.embedded || false,
    showCloseButton: params.showCloseButton !== false,
    showFullScreenButton: params.showFullScreenButton || false,
    startFullScreen: params.startFullScreen || false,
    displayUnreadCount: params.displayUnreadCount || false,
    showMessageDate: params.showMessageDate || false,
    showHeaderAvatar: params.showHeaderAvatar !== false,
    connectingText: params.connectingText || 'Waiting for server...',

    // Media settings
    docViewer: params.docViewer || false,
    params: params.params,

    // Images/Icons
    profileAvatar: params.profileAvatar,
    openLauncherImage: params.openLauncherImage,
    closeImage: params.closeImage,
    headerImage: params.headerImage,

    // Tooltips
    tooltipMessage: params.tooltipMessage,
    tooltipDelay: params.tooltipDelay || 500,
    disableTooltips: params.disableTooltips || false,

    // Experimental flags
    navigateIfSameDomain: params.navigateIfSameDomain,

    // Callbacks
    onSocketEvent: params.onSocketEvent,
    onWidgetEvent: params.onWidgetEvent,
    handleNewUserMessage: params.handleNewUserMessage,
    customMessageDelay: params.customMessageDelay,
    customComponent: params.customComponent,
    customAutoComplete: params.customAutoComplete,
    onNewBlock: params.onNewBlock,

    // Suggestions
    suggestionsConfig: params.suggestionsConfig,

    // Legacy support
    selector: params.selector,
  };

  // Remove undefined values to keep config clean
  return Object.fromEntries(
    Object.entries(config).filter(([_, value]) => value !== undefined),
  );
}

/**
 * Initialize WebChat widget
 * @param {Object} params - Configuration parameters
 */
function init(params) {
  if (!params.selector) {
    console.error('WebChat: selector is required');
    return;
  }

  const container = document.querySelector(params.selector);
  if (!container) {
    console.error(
      `WebChat: element not found for selector "${params.selector}"`,
    );
    return;
  }

  // Map config (functional properties)
  const config = mapConfig(params);

  // Extract theme (visual properties)
  const theme = extractThemeFromParams(params);

  // Widget props - config and theme separated
  const widgetProps = {
    config,
    theme: Object.keys(theme).length > 0 ? theme : null,
  };

  // Render widget
  try {
    widgetInstance = ReactDOM.createRoot(container);
    widgetInstance.render(
      <React.StrictMode>
        <Widget {...widgetProps} />
      </React.StrictMode>,
    );

    console.log('WebChat initialized successfully');

    // Setup queue flush listener for pre-connection messages
    setupQueueFlushListener();
  } catch (error) {
    console.error('WebChat: Failed to initialize', error);
  }
}

/**
 * Setup listener to flush queued messages when connection is established
 * This handles messages sent before the WebSocket connection was ready
 */
async function setupQueueFlushListener() {
  try {
    const serviceInstance = await serviceWhenReady();

    // Remove old listener if exists
    if (queueFlushListener) {
      serviceInstance.off('state:changed', queueFlushListener);
    }

    // Create new listener
    queueFlushListener = (state) => {
      const isConnected = state?.connection?.status === 'connected';

      // Flush queue when connected and there are queued messages
      if (isConnected && messageQueue.size() > 0) {
        console.log(
          `WebChat: Connection established, flushing ${messageQueue.size()} queued messages`,
        );
        messageQueue.flush(async (item) => {
          // Note: sendMessage only accepts text, metadata is stored but not used
          await serviceInstance.sendMessage(item.text);
        });
      }
    };

    // Listen for connection status changes
    serviceInstance.on('state:changed', queueFlushListener);

    // Check if already connected and flush immediately
    const currentState = serviceInstance.getState();
    const isAlreadyConnected = currentState?.connection?.status === 'connected';
    if (isAlreadyConnected && messageQueue.size() > 0) {
      console.log(
        `WebChat: Already connected, flushing ${messageQueue.size()} queued messages`,
      );
      messageQueue.flush(async (item) => {
        // Note: sendMessage only accepts text, metadata is stored but not used
        await serviceInstance.sendMessage(item.text);
      });
    }
  } catch (error) {
    console.error('WebChat: Failed to setup queue flush listener:', error);
  }
}

/**
 * Destroy widget instance and reset state for clean re-initialization
 */
async function destroy() {
  // Remove event listener before destroying
  if (queueFlushListener) {
    try {
      const serviceInstance = await serviceWhenReady(1000); // Short timeout
      serviceInstance.off('state:changed', queueFlushListener);
    } catch (_error) {
      // Service not ready, listener wasn't attached anyway
    }
    queueFlushListener = null;
  }

  if (widgetInstance) {
    widgetInstance.unmount();
    widgetInstance = null;
  }

  // Reset service instance to allow clean re-initialization
  resetServiceInstance();

  // Clear message queue
  messageQueue.clear();
}

/**
 * Open chat window
 * TODO: Implement via service events or refs
 */
function open() {
  console.warn('WebChat.open() - Not implemented yet');
  // TODO: Dispatch event to Widget component
}

/**
 * Close chat window
 * TODO: Implement via service events or refs
 */
function close() {
  console.warn('WebChat.close() - Not implemented yet');
  // TODO: Dispatch event to Widget component
}

/**
 * Toggle chat window
 * TODO: Implement via service events or refs
 */
function toggle() {
  console.warn('WebChat.toggle() - Not implemented yet');
  // TODO: Dispatch event to Widget component
}

/**
 * Validate message input before sending
 * @param {string|Object} message - Message to validate (string or {text, metadata})
 * @returns {{valid: boolean, text?: string, metadata?: Object}} Validation result
 */
function validateMessage(message) {
  // Check if widget is initialized
  if (!widgetInstance) {
    console.error('WebChat.send(): Widget not initialized. Call init() first.');
    return { valid: false };
  }

  // Handle null/undefined
  if (message == null) {
    console.warn('WebChat.send(): Message cannot be null or undefined');
    return { valid: false };
  }

  // Extract text and metadata from string or object
  let text = '';
  let metadata = null;

  if (typeof message === 'string') {
    text = message;
  } else if (typeof message === 'object' && 'text' in message) {
    text = message.text;
    metadata = message.metadata || null;
  } else {
    console.warn(
      'WebChat.send(): Invalid message format. Expected string or { text: string, metadata?: object }',
    );
    return { valid: false };
  }

  // Check empty string after trim
  if (text.trim().length === 0) {
    console.warn('WebChat.send(): Message text cannot be empty');
    return { valid: false };
  }

  // Enforce max length
  const MAX_LENGTH = 10000;
  if (text.length > MAX_LENGTH) {
    console.warn(
      `WebChat.send(): Message exceeds maximum length of ${MAX_LENGTH} characters. Truncating.`,
    );
    text = text.substring(0, MAX_LENGTH);
  }

  return { valid: true, text, metadata };
}

/**
 * Send message programmatically
 * Supports both string messages and objects with text + metadata
 * @param {string|Object} message - Message to send (string or {text, metadata})
 *
 * @example
 * // Send simple text
 * WebChat.send('Hello');
 *
 * // Send with metadata
 * WebChat.send({ text: 'Help', metadata: { source: 'button', page: '/pricing' } });
 */
async function send(message) {
  // Validate message input
  const validation = validateMessage(message);
  if (!validation.valid) {
    return;
  }

  const { text, metadata } = validation;

  try {
    // Wait for service to be ready (with timeout)
    const serviceInstance = await serviceWhenReady(15000);

    // Auto-open chat if closed so user can see the message
    const session = serviceInstance.getSession?.();
    if (session && !session.isChatOpen) {
      serviceInstance.setIsChatOpen(true);
    }

    // Check connection status
    const state = serviceInstance.getState();
    const isConnected = state?.connection?.status === 'connected';

    if (isConnected) {
      // Send immediately if connected
      serviceInstance.sendMessage(text, metadata ? { metadata } : undefined);
    } else {
      // Queue for later if not connected
      messageQueue.enqueue({ text, metadata });
    }
  } catch (error) {
    if (error.message === 'Service ready timeout') {
      // Queue the message anyway for when connection is established
      messageQueue.enqueue({ text, metadata });
    }
  }
}

/**
 * Clear chat history
 * TODO: Implement via service
 */
function clear() {
  console.warn('WebChat.clear() - Not implemented yet');
  // TODO: Access service instance and clear session
}

/**
 * Set session ID
 * TODO: Implement via service
 */
function setSessionId(sessionId) {
  console.warn('WebChat.setSessionId() - Not implemented yet', sessionId);
  // TODO: Access service instance and set session
}

/**
 * Set context
 */
async function setContext(context) {
  const service = await serviceWhenReady();
  service.setContext(context);
}

/**
 * Get context
 */
async function getContext() {
  const service = await serviceWhenReady();
  return service.getContext();
}

/**
 * Set custom field
 */
async function setCustomField(field, value) {
  const service = await serviceWhenReady();
  service.setCustomField(field, value);
}

/**
 * Check if chat is open
 * TODO: Implement via service state
 */
function isOpen() {
  console.warn('WebChat.isOpen() - Not implemented yet');
  // TODO: Check widget state
  return false;
}

/**
 * Check if chat is visible
 * TODO: Implement via service state
 */
function isVisible() {
  console.warn('WebChat.isVisible() - Not implemented yet');
  // TODO: Check widget state
  return false;
}

/**
 * Reload widget
 */
function reload() {
  console.warn('WebChat.reload() - Not implemented yet');
  // TODO: Implement reload logic
}

/**
 * Check if WebSocket connection is established
 * @returns {Promise<boolean>} True if connected
 */
async function isConnected() {
  try {
    const serviceInstance = await serviceWhenReady(5000);
    const state = serviceInstance.getState();
    return state?.connection?.status === 'connected';
  } catch {
    return false;
  }
}

/**
 * Wait for WebSocket connection AND service initialization
 * Returns a Promise that resolves when both connected and initialized, or rejects on timeout
 * @param {number} timeoutMs - Maximum time to wait (default 10000ms)
 * @returns {Promise<void>}
 */
function onReady(timeoutMs = 10000) {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    let settled = false;
    let timeoutId = null;
    let stateListener = null;
    let initListener = null;

    const cleanup = (serviceInstance) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (serviceInstance) {
        if (stateListener) serviceInstance.off('state:changed', stateListener);
        if (initListener) serviceInstance.off('initialized', initListener);
      }
    };

    const doResolve = (serviceInstance) => {
      if (settled) return;
      settled = true;
      cleanup(serviceInstance);
      resolve();
    };

    const doReject = (serviceInstance, error) => {
      if (settled) return;
      settled = true;
      cleanup(serviceInstance);
      reject(error);
    };

    const checkReady = (serviceInstance) => {
      const state = serviceInstance.getState();
      const isConnected = state?.connection?.status === 'connected';
      const isInitialized = serviceInstance._initialized === true;

      if (isConnected && isInitialized) {
        doResolve(serviceInstance);
        return true;
      }
      return false;
    };

    try {
      const serviceInstance = await serviceWhenReady(timeoutMs);

      // Check if already ready (connected AND initialized)
      if (checkReady(serviceInstance)) {
        return;
      }

      // Set up listeners for both connection and initialization
      stateListener = () => checkReady(serviceInstance);
      initListener = () => checkReady(serviceInstance);

      serviceInstance.on('state:changed', stateListener);
      serviceInstance.on('initialized', initListener);

      // Set up timeout
      const remainingTime = timeoutMs - (Date.now() - startTime);
      timeoutId = setTimeout(() => {
        doReject(serviceInstance, new Error('Connection/initialization timeout'));
      }, remainingTime);
    } catch (error) {
      doReject(null, error);
    }
  });
}

// Export WebChat API
const WebChat = {
  init,
  destroy,
  open,
  close,
  toggle,
  send,
  clear,
  setSessionId,
  setContext,
  getContext,
  setCustomField,
  isOpen,
  isVisible,
  isConnected,
  onReady,
  reload,
};

WebChat.default = WebChat;

// Expose to window for script tag usage
if (typeof window !== 'undefined') {
  window.WebChat = WebChat;
}

export default WebChat;
