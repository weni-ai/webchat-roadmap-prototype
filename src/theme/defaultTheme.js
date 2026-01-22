/**
 * Default theme configuration for Weni Webchat
 * All values can be overridden via the theme prop
 */
const defaultTheme = {
  colors: {
    // Primary colors
    primary: '#009E96',
    secondary: '#F5F5F5',

    // Header colors
    titleColor: '#FFFFFF',
    subtitleColor: '#E0E0E0',
    headerBackgroundColor: '#009E96',

    // Chat colors
    chatBackgroundColor: '#FFFFFF',

    // Launcher colors
    launcherColor: '#009E96',
    mainColor: '#009E96',

    // Input colors
    inputBackgroundColor: '#FFFFFF',
    inputFontColor: '#000000',
    inputPlaceholderColor: '#9E9E9E',

    // User message colors
    userMessageBubbleColor: '#009E96',
    userMessageTextColor: '#FFFFFF',

    // Bot message colors
    botMessageBubbleColor: '#F5F5F5',
    botMessageTextColor: '#000000',
    fullScreenBotMessageBubbleColor: '#FFFFFF',

    // Quick replies colors
    quickRepliesFontColor: '#009E96',
    quickRepliesBackgroundColor: '#FFFFFF',
    quickRepliesBorderColor: '#009E96',
    quickRepliesBorderWidth: '2px',

    // Suggestions colors
    suggestionsBackgroundColor: '#FFFFFF',
    suggestionsSeparatorColor: '#E0E0E0',
    suggestionsFontColor: '#000000',
    suggestionsHoverFontColor: '#009E96',
  },

  dimensions: {
    widgetHeight: '600px',
    widgetWidth: '400px',
    launcherHeight: '56px',
    launcherWidth: '56px',
  },
};

export default defaultTheme;
