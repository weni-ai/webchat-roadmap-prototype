import React from 'react'
import PropTypes from 'prop-types'
import ChatIcon from '@/assets/icons/chat.svg'
import CloseIcon from '@/assets/icons/close.svg'
import './Icon.scss'

/**
 * Icon - Icon component wrapper
 * TODO: Support different icon libraries (SVG, icon fonts, images)
 * TODO: Add color customization
 * TODO: Implement common icons (send, attach, close, etc.)
 */
export function Icon({ name, size = 'medium', color = 'currentColor', className = '', ...props }) {
  // TODO: Implement icon rendering based on icon library
  // TODO: Support custom SVG icons

  const icons = {
    chat: ChatIcon,
    close: CloseIcon
  }

  const icon = icons[name]

  if (!icon) {
    return null
  }
  
  return (
    <img 
      className={`icon icon--${name} icon--${size} ${className}`}
      style={{ color }}
      alt={name}
      src={icon}
      {...props}
    />
  )
}

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'x-large']),
  color: PropTypes.string,
  className: PropTypes.string
}

export default Icon

