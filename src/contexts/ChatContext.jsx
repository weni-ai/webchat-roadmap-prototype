import React, { createContext, useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import WeniWebchatService from '@weni/webchat-service'

const ChatContext = createContext()

/**
 * ChatProvider - Context provider that integrates WeniWebchatService
 * TODO: Handle all service events and state management
 * TODO: Implement error handling and reconnection logic
 * TODO: Add support for custom event handlers
 */
export function ChatProvider({ children, config }) {
  const [service] = useState(() => new WeniWebchatService(config))
  const [messages, setMessages] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  useEffect(() => {
    // TODO: Initialize service with proper error handling
    service.init()
    
    // TODO: Setup all event listeners
    service.on('connected', () => setIsConnected(true))
    service.on('disconnected', () => setIsConnected(false))
    service.on('message:received', (msg) => {
      setMessages(prev => [...prev, msg])
      // TODO: Update unread count when chat is closed
    })
    service.on('typing:start', () => setIsTyping(true))
    service.on('typing:stop', () => setIsTyping(false))
    
    // TODO: Add more event listeners (error, state:changed, etc.)
    
    return () => {
      // TODO: Cleanup all event listeners
      service.disconnect()
    }
  }, [service])
  
  const value = {
    service,
    messages,
    isConnected,
    isTyping,
    isChatOpen,
    setIsChatOpen,
    unreadCount,
    setUnreadCount,
    sendMessage: (text) => service.sendMessage(text),
    sendAttachment: (file) => service.sendAttachment(file),
    // TODO: Add more helper methods (clearSession, getHistory, etc.)
  }
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

ChatProvider.propTypes = {
  children: PropTypes.node.isRequired,
  config: PropTypes.shape({
    socketUrl: PropTypes.string.isRequired,
    channelUuid: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,
    // TODO: Add all config properties
  }).isRequired
}

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}

export default ChatContext
