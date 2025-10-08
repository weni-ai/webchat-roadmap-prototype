import React, { createContext, useContext } from 'react'
import PropTypes from 'prop-types'
import defaultTheme from './defaultTheme'

const ThemeContext = createContext(defaultTheme)

/**
 * ThemeProvider - Theme context provider
 * TODO: Merge custom theme with default theme
 * TODO: Support CSS custom properties injection
 * TODO: Add theme switching support
 * TODO: Validate theme structure
 */
export function ThemeProvider({ children, theme = null }) {
  // TODO: Merge custom theme with default theme
  const mergedTheme = { ...defaultTheme, ...theme }
  
  // TODO: Inject CSS custom properties for theme values
  // TODO: Add theme validation
  
  return (
    <ThemeContext.Provider value={mergedTheme}>
      {children}
    </ThemeContext.Provider>
  )
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
  theme: PropTypes.object
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeProvider

