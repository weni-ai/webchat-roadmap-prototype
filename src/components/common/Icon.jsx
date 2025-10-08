import React from 'react'
import PropTypes from 'prop-types'

/**
 * Icon - Icon component wrapper
 * TODO: Support different icon libraries (SVG, icon fonts)
 * TODO: Add size variants
 * TODO: Add color customization
 * TODO: Implement common icons (send, attach, close, etc.)
 */
export function Icon({ name, size = 'medium', color = 'currentColor', className = '', ...props }) {
  // TODO: Implement icon rendering based on icon library
  // TODO: Support custom SVG icons
  
  return (
    <span 
      className={`weni-icon weni-icon-${name} weni-icon-${size} ${className}`}
      style={{ color }}
      {...props}
    >
      {/* TODO: Render icon based on name */}
    </span>
  )
}

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.string,
  className: PropTypes.string
}

export default Icon

