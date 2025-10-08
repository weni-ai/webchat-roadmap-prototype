/**
 * Standalone entry point for script tag usage
 * This file provides WebChat.init() method for backward compatibility
 * with the old weni-webchannel usage pattern
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import Widget from './components/Widget/Widget'
import './styles/index.css'

let widgetInstance = null

/**
 * Map old customizeWidget options to theme format
 */
function mapCustomizeToTheme(customize) {
  if (!customize) return null
  
  return {
    colors: {
      primary: customize.launcherColor || customize.mainColor,
      messageClient: customize.userMessageBubbleColor,
      headerBackground: customize.headerBackgroundColor,
      quickReplyText: customize.quickRepliesFontColor,
      quickReplyBackground: customize.quickRepliesBackgroundColor,
      quickReplyBorder: customize.quickRepliesBorderColor
    }
  }
}

/**
 * Map old params to new config format
 */
function mapConfig(params) {
  const config = {
    socketUrl: params.socketUrl,
    channelUuid: params.channelUuid,
    host: params.host,
    connectOn: params.connectOn || 'mount',
    storage: params.params?.storage || 'local'
  }
  
  // Map other options
  if (params.initPayload) config.initPayload = params.initPayload
  if (params.customData) config.customData = params.customData
  if (params.sessionId) config.sessionId = params.sessionId
  if (params.sessionToken) config.sessionToken = params.sessionToken
  if (params.autoClearCache !== undefined) config.autoClearCache = params.autoClearCache
  if (params.contactTimeout !== undefined) config.contactTimeout = params.contactTimeout
  
  return config
}

/**
 * Initialize WebChat widget
 * @param {Object} params - Configuration parameters
 */
function init(params) {
  if (!params.selector) {
    console.error('WebChat: selector is required')
    return
  }
  
  const container = document.querySelector(params.selector)
  if (!container) {
    console.error(`WebChat: element not found for selector "${params.selector}"`)
    return
  }
  
  // Map old config to new format
  const config = mapConfig(params)
  const theme = mapCustomizeToTheme(params.customizeWidget)
  
  // Widget props
  const widgetProps = {
    config,
    theme,
    // UI options
    title: params.title,
    subtitle: params.subtitle,
    inputPlaceholder: params.inputTextFieldHint,
    showCloseButton: params.showCloseButton !== false,
    showFullScreenButton: params.showFullScreenButton || false,
    displayUnreadCount: params.displayUnreadCount || false,
    embedded: params.embedded || false,
    startFullScreen: params.startFullScreen || false,
    // TODO: Map more options as needed
  }
  
  // Render widget
  try {
    widgetInstance = ReactDOM.createRoot(container)
    widgetInstance.render(
      <React.StrictMode>
        <Widget {...widgetProps} />
      </React.StrictMode>
    )
    
    console.log('WebChat initialized successfully')
  } catch (error) {
    console.error('WebChat: Failed to initialize', error)
  }
}

/**
 * Destroy widget instance
 */
function destroy() {
  if (widgetInstance) {
    widgetInstance.unmount()
    widgetInstance = null
  }
}

/**
 * Open chat window
 * TODO: Implement via service events or refs
 */
function open() {
  console.warn('WebChat.open() - Not implemented yet')
  // TODO: Dispatch event to Widget component
}

/**
 * Close chat window
 * TODO: Implement via service events or refs
 */
function close() {
  console.warn('WebChat.close() - Not implemented yet')
  // TODO: Dispatch event to Widget component
}

/**
 * Toggle chat window
 * TODO: Implement via service events or refs
 */
function toggle() {
  console.warn('WebChat.toggle() - Not implemented yet')
  // TODO: Dispatch event to Widget component
}

/**
 * Send message programmatically
 * TODO: Implement via service
 */
function send(message) {
  console.warn('WebChat.send() - Not implemented yet', message)
  // TODO: Access service instance and send message
}

/**
 * Clear chat history
 * TODO: Implement via service
 */
function clear() {
  console.warn('WebChat.clear() - Not implemented yet')
  // TODO: Access service instance and clear session
}

/**
 * Set session ID
 * TODO: Implement via service
 */
function setSessionId(sessionId) {
  console.warn('WebChat.setSessionId() - Not implemented yet', sessionId)
  // TODO: Access service instance and set session
}

/**
 * Set context
 * TODO: Implement via service
 */
function setContext(context) {
  console.warn('WebChat.setContext() - Not implemented yet', context)
  // TODO: Access service instance and set context
}

/**
 * Get context
 * TODO: Implement via service
 */
function getContext() {
  console.warn('WebChat.getContext() - Not implemented yet')
  // TODO: Access service instance and get context
  return ''
}

/**
 * Check if chat is open
 * TODO: Implement via service state
 */
function isOpen() {
  console.warn('WebChat.isOpen() - Not implemented yet')
  // TODO: Check widget state
  return false
}

/**
 * Check if chat is visible
 * TODO: Implement via service state
 */
function isVisible() {
  console.warn('WebChat.isVisible() - Not implemented yet')
  // TODO: Check widget state
  return false
}

/**
 * Reload widget
 */
function reload() {
  console.warn('WebChat.reload() - Not implemented yet')
  // TODO: Implement reload logic
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
  isOpen,
  isVisible,
  reload
}

// Expose to window for script tag usage
if (typeof window !== 'undefined') {
  window.WebChat = { default: WebChat }
}

export default WebChat
