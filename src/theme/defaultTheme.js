/**
 * Default theme configuration
 * TODO: Add complete theme tokens
 * TODO: Support light/dark mode
 * TODO: Add responsive breakpoints
 * TODO: Add animation/transition values
 */
const defaultTheme = {
  colors: {
    // Primary colors
    primary: '#0084FF',
    primaryDark: '#0066CC',
    primaryLight: '#3399FF',
    
    // Secondary colors
    secondary: '#6C757D',
    
    // Status colors
    success: '#28A745',
    warning: '#FFC107',
    error: '#DC3545',
    info: '#17A2B8',
    
    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',
    gray100: '#F8F9FA',
    gray200: '#E9ECEF',
    gray300: '#DEE2E6',
    gray400: '#CED4DA',
    gray500: '#ADB5BD',
    gray600: '#6C757D',
    gray700: '#495057',
    gray800: '#343A40',
    gray900: '#212529',
    
    // Message colors
    messageClient: '#0084FF',
    messageAgent: '#F0F0F0',
    messageBot: '#E8F4FF',
    
    // Text colors
    textPrimary: '#212529',
    textSecondary: '#6C757D',
    textDisabled: '#ADB5BD',
    textInverse: '#FFFFFF'
  },
  
  fonts: {
    family: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    },
    size: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px'
    },
    weight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.8
    }
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px'
  },
  
  sizes: {
    // Widget sizes
    widgetWidth: '400px',
    widgetHeight: '600px',
    widgetMaxHeight: '90vh',
    
    // Component sizes
    launcherSize: '60px',
    headerHeight: '60px',
    inputHeight: '60px',
    
    // Border radius
    radiusSmall: '4px',
    radiusMedium: '8px',
    radiusLarge: '12px',
    radiusFull: '9999px'
  },
  
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.12)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.12)',
    large: '0 10px 20px rgba(0, 0, 0, 0.15)',
    widget: '0 4px 16px rgba(0, 0, 0, 0.2)'
  },
  
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  
  zIndex: {
    launcher: 1000,
    widget: 999,
    modal: 1001,
    tooltip: 1002
  }
}

export default defaultTheme

