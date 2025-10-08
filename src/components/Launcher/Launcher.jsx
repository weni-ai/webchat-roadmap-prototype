import React from 'react'
import PropTypes from 'prop-types'

import { useWeniChat } from '@/hooks/useWeniChat'

import Badge from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'

import './Launcher.scss'

/**
 * Launcher - Chat launcher button
 * TODO: Add unread count badge
 * TODO: Add dinamically image url as Icon
 */
export function Launcher() {
  const { isChatOpen, unreadCount, toggleChat } = useWeniChat()
  
  // TODO: Fix first click animation "glitch"
  
  return (
    <button 
      className={`webchat-launcher`}
      onClick={toggleChat}
      aria-label="Toggle chat"
    >
      {!isChatOpen && unreadCount > 0 && (
        <Badge count={unreadCount} />
      )}
      <Icon className={isChatOpen ? "webchat-launcher-icon--click-open" : "webchat-launcher-icon--click-close"} name={isChatOpen ? "close" : "chat"} size="x-large" />
    </button>
  )
}

Launcher.propTypes = {
  position: PropTypes.oneOf(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
}

export default Launcher