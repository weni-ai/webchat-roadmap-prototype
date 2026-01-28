import WeniWebchatService from '@weni/webchat-service';
import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import i18n from '@/i18n';
import { navigateIfSameDomain } from '@/experimental/navigateIfSameDomain';
import { VoiceService } from '@/services/voice/VoiceService';

const createInitialServiceInstance = () => ({
  fns: [],
  onReady: () => {
    return new Promise((resolve) => {
      serviceInstance.fns.push(resolve);
    });
  },
});

let serviceInstance = createInitialServiceInstance();

/**
 * Reset service instance to initial state.
 * Should be called when destroying the widget to allow clean re-initialization.
 */
export function resetServiceInstance() {
  serviceInstance = createInitialServiceInstance();
}

const ChatContext = createContext();

/**
 * Default configuration values
 */
const defaultConfig = {
  // Connection settings
  connectOn: 'mount',
  storage: 'local',
  hideWhenNotConnected: true,
  autoClearCache: false,
  contactTimeout: 0,

  // UI settings
  title: 'Welcome',
  inputTextFieldHint: 'Type a message',
  embedded: false,
  showCloseButton: true,
  showFullScreenButton: false,
  startFullScreen: false,
  displayUnreadCount: false,
  showMessageDate: false,
  showHeaderAvatar: true,
  connectingText: 'Waiting for server...',

  // Media settings
  docViewer: false,

  // Tooltips
  tooltipDelay: 500,
  disableTooltips: false,

  // Components settings
  showAudioRecorder: true,
  showCameraRecorder: true,
  showFileUploader: true,

  // Message filtering callbacks
  onNewBlock: null, // Callback: (block: string) => void - Called when tagged blocks are detected

  // Experimental flags
  navigateIfSameDomain: false,
};

/**
 * ChatProvider - Context provider that integrates WeniWebchatService
 *
 * This component follows the Service/Template architecture:
 * - Service (WeniWebchatService): Manages all business logic, WebSocket, and state
 * - Template (React components): Only renders UI and handles user interactions
 *
 * SINGLE SOURCE OF TRUTH:
 * The service StateManager is the only source of truth for:
 * - Messages (including sender, timestamp, processing)
 * - Connection state
 * - Typing indicators (isTyping, isThinking)
 * - Session management and context
 * - Error state
 *
 * The template only manages UI-specific state:
 * - Chat open/closed
 * - Unread count
 * - Visual preferences
 */
export function ChatProvider({ children, config }) {
  const mergedConfig = { ...defaultConfig, ...config };

  if (mergedConfig.embedded) {
    mergedConfig.startFullScreen = true;
    mergedConfig.showFullScreenButton = false;
    mergedConfig.showCloseButton = false;
  }

  // Service instance
  const [service] = useState(() => {
    // Safely get pending callbacks (fns may be undefined after destroy/reinit)
    const fns = Array.isArray(serviceInstance?.fns) ? serviceInstance.fns : [];
    serviceInstance = new WeniWebchatService(mergedConfig);
    fns.forEach((fn) => fn(serviceInstance));
    return serviceInstance;
  });

  // State comes from service
  const [state, setState] = useState(() => service.getState());

  // Messages state
  const [context, setContext] = useState(state.context);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Camera recording state
  const [isCameraRecording, setIsCameraRecording] = useState(false);
  const [cameraRecordingStream, setCameraRecordingStream] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);

  // Voice mode state
  const [voiceService, setVoiceService] = useState(null);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [voiceModeState, setVoiceModeState] = useState(null);
  const [voicePartialTranscript, setVoicePartialTranscript] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const [isVoiceModeSupported] = useState(() => VoiceService.isSupported());

  // UI-specific state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(
    mergedConfig.startFullScreen,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [configState] = useState(mergedConfig);

  const [title] = useState(mergedConfig.title);
  const [tooltipMessage, setTooltipMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);

  const isChatOpenRef = useRef(isChatOpen);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  let initialTooltipMessageTimeout = null;

  function displaysTooltipAsAReceivedMessage(message) {
    if (isChatOpenRef.current) {
      return;
    }

    service.simulateMessageReceived({
      type: 'message',
      message: {
        text: message,
      },
    });
  }

  useEffect(() => {
    if (mergedConfig.tooltipMessage) {
      initialTooltipMessageTimeout = setTimeout(() => {
        if (service.getMessages().length !== 0) {
          return;
        }

        displaysTooltipAsAReceivedMessage(mergedConfig.tooltipMessage);
      }, mergedConfig.tooltipDelay);
    }

    service
      .init()
      .then(() => {
        if (mergedConfig.startFullScreen) {
          service.setIsChatOpen(true);
        } else {
          setIsChatOpen(service.getSession()?.isChatOpen || false);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize service:', error);
      });

    service.on('state:changed', (newState) => {
      setState(newState);
    });

    // Audio recording events (UI-specific feedback)
    service.on('recording:started', () => setIsRecording(true));
    service.on('recording:stopped', () => setIsRecording(false));
    service.on('recording:tick', (duration) => setRecordingDuration(duration));
    service.on('recording:cancelled', () => setIsRecording(false));

    service.on('camera:stream:received', (stream) =>
      setCameraRecordingStream(stream),
    );
    service.on('camera:recording:started', () => setIsCameraRecording(true));
    service.on('camera:recording:stopped', () => setIsCameraRecording(false));
    service.on('camera:devices:changed', (devices) =>
      setCameraDevices(devices),
    );

    service.on('context:changed', (context) => setContext(context));

    service.on('language:changed', (language) => i18n.changeLanguage(language));

    service.on('chat:open:changed', (isOpen) => setIsChatOpen(isOpen));

    return () => {
      clearTimeout(initialTooltipMessageTimeout);
      service.removeAllListeners();
      service.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isChatOpen && mergedConfig.initPayload) {
      const relevantMessages = service
        .getMessages()
        .filter((message) => !message.persisted);

      if (relevantMessages.length === 0) {
        service.sendMessage(mergedConfig.initPayload, { hidden: true });
      }
    }

    const handleMessageReceived = (message) => {
      if (!isChatOpen) {
        setUnreadCount((prev) => prev + 1);

        if (!mergedConfig.disableTooltips) {
          setTooltipMessage(message);
        }
      }

      navigateIfSameDomain(message, mergedConfig.navigateIfSameDomain);
    };

    service.on('message:received', handleMessageReceived);

    return () => {
      service.off('message:received', handleMessageReceived);
    };
  }, [isChatOpen]);

  const stopAndSendAudio = async () => {
    // Stop recording method also sends the audio to the server
    await service.stopRecording();
  };

  // Voice mode methods
  const enterVoiceMode = useCallback(async () => {
    if (!mergedConfig.voiceMode?.enabled || !mergedConfig.voiceMode?.voiceId) {
      console.warn('Voice mode is not configured');
      return;
    }

    // Show the overlay immediately (initializing state)
    setVoiceError(null);
    setIsVoiceModeActive(true);
    setVoiceModeState('initializing');

    try {
      // Create and initialize voice service
      const vs = new VoiceService();
      await vs.init({
        voiceId: mergedConfig.voiceMode.voiceId,
        languageCode: mergedConfig.voiceMode.languageCode || 'pt',
        silenceThreshold: mergedConfig.voiceMode.silenceThreshold,
        enableBargeIn: mergedConfig.voiceMode.enableBargeIn,
        autoListen: mergedConfig.voiceMode.autoListen,
        getToken: mergedConfig.voiceMode.getToken, // For STT
        getApiKey: mergedConfig.voiceMode.getApiKey, // For TTS
        texts: mergedConfig.voiceMode.texts,
      });

      // Set up event listeners
      vs.on('state:changed', ({ state }) => {
        setVoiceModeState(state);
      });

      vs.on('transcript:partial', ({ text }) => {
        setVoicePartialTranscript(text);
      });

      vs.on('transcript:committed', ({ text }) => {
        setVoicePartialTranscript('');
        // Message will be sent via the callback below
      });

      vs.on('error', (error) => {
        setVoiceError(error);
      });

      vs.on('session:ended', () => {
        setIsVoiceModeActive(false);
        setVoiceModeState(null);
        setVoicePartialTranscript('');
      });

      // Set message callback to send via chat service (SINGLE point of sending)
      vs.setMessageCallback((text) => {
        if (text?.trim()) {
          service.sendMessage(text);
        }
      });

      // Start the session
      await vs.startSession();

      setVoiceService(vs);

    } catch (error) {
      console.error('Failed to enter voice mode:', error);
      setVoiceError(error);
      // Keep the overlay open to show the error
      setVoiceModeState('error');
    }
  }, [mergedConfig, service]);

  const exitVoiceMode = useCallback(() => {
    if (voiceService) {
      voiceService.endSession();
      voiceService.destroy();
      setVoiceService(null);
    }
    setIsVoiceModeActive(false);
    setVoiceModeState(null);
    setVoicePartialTranscript('');
    setVoiceError(null);
  }, [voiceService]);

  // Clean up voice service on unmount
  useEffect(() => {
    return () => {
      if (voiceService) {
        voiceService.destroy();
      }
    };
  }, [voiceService]);

  // Track streaming TTS for progressive playback
  const lastProcessedMessageIdRef = useRef(null);
  const lastSpokenTextRef = useRef('');

  // Handle agent response in voice mode - speak progressively as text arrives
  useEffect(() => {
    if (!isVoiceModeActive || !voiceService) {
      return;
    }

    // Get the latest message from the messages array
    const messages = state.messages || [];
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    
    // Only process incoming (agent) messages
    if (lastMessage.direction !== 'incoming') {
      return;
    }

    // Check if this is a new message
    if (lastMessage.id !== lastProcessedMessageIdRef.current) {
      lastProcessedMessageIdRef.current = lastMessage.id;
      lastSpokenTextRef.current = '';
    }

    const currentText = lastMessage.text || '';
    const hasNewText = currentText && currentText !== lastSpokenTextRef.current;
    
    if (hasNewText) {
      // Get only the new text that hasn't been spoken yet
      const newChunk = currentText.substring(lastSpokenTextRef.current.length);
      lastSpokenTextRef.current = currentText;
      
      // Process text chunk for progressive TTS
      // This will speak as soon as we have enough text (sentence ending or min length)
      const isComplete = lastMessage.status !== 'streaming';
      voiceService.processTextChunk(newChunk, isComplete);
    }
  }, [isVoiceModeActive, voiceService, state.messages]);

  const value = {
    // Service instance (for advanced use cases)
    service,

    // State from service StateManager (single source of truth)
    messages: state.messages || [],
    isConnected: state.connection?.status === 'connected',
    isConnectionClosed: state.connection?.status === 'closed',
    isTyping: state.isTyping || false,
    isThinking: state.isThinking || false,
    context,
    error: state.error || null,

    // Audio recording state (UI-specific)
    isRecording,
    recordingDuration,
    isAudioRecordingSupported: service.isAudioRecordingSupported,

    // Camera recording state
    isCameraRecording,
    cameraRecordingStream,
    cameraDevices,

    // UI-specific state
    title,
    isChatOpen,
    setIsChatOpen: (isOpen) => service.setIsChatOpen(isOpen),
    isChatFullscreen,
    toggleChatFullscreen: () => setIsChatFullscreen(!isChatFullscreen),
    unreadCount,
    setUnreadCount,
    config: configState,
    fileConfig: service.getFileConfig(),
    tooltipMessage,
    clearTooltipMessage: () => setTooltipMessage(null),
    currentPage,
    setCurrentPage,

    // Service methods (proxied for convenience)
    connect: () => service.connect(),
    sendMessage: (text) => service.sendMessage(text),
    sendAttachment: (file) => service.sendAttachment(file),
    stopAndSendAudio,
    startRecording: () => service.startRecording(),
    stopRecording: () => service.stopRecording(),
    cancelRecording: () => service.cancelRecording(),
    hasAudioPermission: () => service.hasAudioPermission(),
    requestAudioPermission: () => service.requestAudioPermission(),
    hasCameraPermission: () => service.hasCameraPermission(),
    requestCameraPermission: () => service.requestCameraPermission(),
    startCameraRecording: () => service.startCameraRecording(),
    stopCameraRecording: () => service.stopCameraRecording(),
    switchToNextCameraDevice: () => service.switchToNextCameraDevice(),

    // Voice mode state and methods
    voiceService,
    isVoiceModeActive,
    isVoiceModeSupported,
    voiceModeState,
    voicePartialTranscript,
    voiceError,
    enterVoiceMode,
    exitVoiceMode,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

ChatProvider.propTypes = {
  children: PropTypes.node.isRequired,
  config: PropTypes.shape({
    // Required properties
    socketUrl: PropTypes.string.isRequired,
    channelUuid: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,

    // Connection settings
    initPayload: PropTypes.string,
    sessionId: PropTypes.string,
    sessionToken: PropTypes.string,
    customData: PropTypes.object,
    connectOn: PropTypes.oneOf(['mount', 'manual', 'demand']),
    storage: PropTypes.oneOf(['local', 'session']),
    hideWhenNotConnected: PropTypes.bool,
    autoClearCache: PropTypes.bool,
    contactTimeout: PropTypes.number,

    // UI settings
    title: PropTypes.string,
    subtitle: PropTypes.string,
    inputTextFieldHint: PropTypes.string,
    embedded: PropTypes.bool,
    showCloseButton: PropTypes.bool,
    showFullScreenButton: PropTypes.bool,
    startFullScreen: PropTypes.bool,
    displayUnreadCount: PropTypes.bool,
    showMessageDate: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
    showHeaderAvatar: PropTypes.bool,
    connectingText: PropTypes.string,

    // Media settings
    docViewer: PropTypes.bool,
    params: PropTypes.shape({
      images: PropTypes.shape({
        dims: PropTypes.shape({
          width: PropTypes.number,
          height: PropTypes.number,
        }),
      }),
    }),

    // Images/Icons
    profileAvatar: PropTypes.string,
    openLauncherImage: PropTypes.string,
    closeImage: PropTypes.string,
    headerImage: PropTypes.string,

    // Tooltips
    tooltipMessage: PropTypes.string,
    tooltipDelay: PropTypes.number,
    disableTooltips: PropTypes.bool,

    // Experimental flags
    navigateIfSameDomain: PropTypes.bool,

    // Callbacks and custom functions
    onSocketEvent: PropTypes.objectOf(PropTypes.func),
    onWidgetEvent: PropTypes.shape({
      onChatOpen: PropTypes.func,
      onChatClose: PropTypes.func,
      onChatHidden: PropTypes.func,
    }),
    handleNewUserMessage: PropTypes.func,
    customMessageDelay: PropTypes.func,
    customComponent: PropTypes.func,
    customAutoComplete: PropTypes.func,

    // Suggestions
    suggestionsConfig: PropTypes.shape({
      url: PropTypes.string,
      datasets: PropTypes.arrayOf(PropTypes.string),
      language: PropTypes.string,
      excludeIntents: PropTypes.arrayOf(PropTypes.string),
      automaticSend: PropTypes.bool,
    }),

    // Legacy support
    selector: PropTypes.string,

    // Voice mode settings
    voiceMode: PropTypes.shape({
      enabled: PropTypes.bool,
      voiceId: PropTypes.string,
      languageCode: PropTypes.string,
      silenceThreshold: PropTypes.number,
      enableBargeIn: PropTypes.bool,
      autoListen: PropTypes.bool,
      getToken: PropTypes.func,
      texts: PropTypes.shape({
        title: PropTypes.string,
        listening: PropTypes.string,
        microphoneHint: PropTypes.string,
        speaking: PropTypes.string,
        processing: PropTypes.string,
        errorTitle: PropTypes.string,
      }),
    }),
  }).isRequired,
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
export { serviceInstance as service };
