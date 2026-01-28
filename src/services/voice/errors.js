/**
 * Voice Mode Error Types and Utilities
 *
 * Provides structured error handling for voice mode operations
 * including microphone access, STT, TTS, and network errors.
 */

/**
 * Voice error codes for programmatic handling
 * @enum {string}
 */
export const VoiceErrorCode = {
  MICROPHONE_PERMISSION_DENIED: 'MICROPHONE_PERMISSION_DENIED',
  MICROPHONE_NOT_FOUND: 'MICROPHONE_NOT_FOUND',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
  STT_CONNECTION_FAILED: 'STT_CONNECTION_FAILED',
  STT_TRANSCRIPTION_FAILED: 'STT_TRANSCRIPTION_FAILED',
  TTS_GENERATION_FAILED: 'TTS_GENERATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Error metadata mapping for user-friendly messages and recovery hints
 * Messages are in Portuguese (pt-BR)
 */
const ERROR_METADATA = {
  [VoiceErrorCode.MICROPHONE_PERMISSION_DENIED]: {
    message: 'O acesso ao microfone foi negado',
    suggestion: 'Por favor, permita o acesso ao microfone nas configurações do navegador',
    recoverable: true,
  },
  [VoiceErrorCode.MICROPHONE_NOT_FOUND]: {
    message: 'Nenhum microfone foi encontrado',
    suggestion: 'Por favor, conecte um microfone e tente novamente',
    recoverable: false,
  },
  [VoiceErrorCode.BROWSER_NOT_SUPPORTED]: {
    message: 'Seu navegador não suporta o modo de voz',
    suggestion: 'Por favor, use Chrome, Firefox, Safari ou Edge',
    recoverable: false,
  },
  [VoiceErrorCode.STT_CONNECTION_FAILED]: {
    message: 'Não foi possível conectar ao serviço de reconhecimento de voz',
    suggestion: 'Verifique sua conexão e tente novamente',
    recoverable: true,
  },
  [VoiceErrorCode.STT_TRANSCRIPTION_FAILED]: {
    message: 'O reconhecimento de voz falhou',
    suggestion: 'Por favor, tente falar novamente',
    recoverable: true,
  },
  [VoiceErrorCode.TTS_GENERATION_FAILED]: {
    message: 'Não foi possível gerar a fala',
    suggestion: 'A resposta será mostrada como texto',
    recoverable: true,
  },
  [VoiceErrorCode.NETWORK_ERROR]: {
    message: 'Conexão de rede perdida',
    suggestion: 'Por favor, verifique sua conexão com a internet',
    recoverable: true,
  },
  [VoiceErrorCode.TOKEN_EXPIRED]: {
    message: 'A autenticação expirou',
    suggestion: 'Reconectando...',
    recoverable: true,
  },
  [VoiceErrorCode.RATE_LIMITED]: {
    message: 'Muitas solicitações',
    suggestion: 'Por favor, aguarde um momento e tente novamente',
    recoverable: true,
  },
  [VoiceErrorCode.UNKNOWN_ERROR]: {
    message: 'Ocorreu um erro inesperado',
    suggestion: 'Por favor, tente novamente',
    recoverable: true,
  },
};

/**
 * VoiceError class for structured voice mode errors
 */
export class VoiceError extends Error {
  /**
   * @param {string} code - VoiceErrorCode value
   * @param {string} [customMessage] - Optional custom message override
   * @param {Error} [originalError] - Original error that caused this
   */
  constructor(code, customMessage, originalError) {
    const metadata = ERROR_METADATA[code] || ERROR_METADATA[VoiceErrorCode.UNKNOWN_ERROR];
    super(customMessage || metadata.message);

    this.name = 'VoiceError';
    this.code = code;
    this.suggestion = metadata.suggestion;
    this.recoverable = metadata.recoverable;
    this.originalError = originalError || null;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VoiceError);
    }
  }

  /**
   * Convert to plain object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
      recoverable: this.recoverable,
    };
  }
}

/**
 * Factory function to create VoiceError from various error types
 * @param {string} code - VoiceErrorCode value
 * @param {Error|string} [errorOrMessage] - Original error or custom message
 * @returns {VoiceError}
 */
export function createVoiceError(code, errorOrMessage) {
  if (errorOrMessage instanceof Error) {
    return new VoiceError(code, null, errorOrMessage);
  }
  return new VoiceError(code, errorOrMessage);
}

/**
 * Determine error code from MediaDevices error
 * @param {Error} error - Error from getUserMedia
 * @returns {string} - VoiceErrorCode
 */
export function getMediaErrorCode(error) {
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    return VoiceErrorCode.MICROPHONE_PERMISSION_DENIED;
  }
  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    return VoiceErrorCode.MICROPHONE_NOT_FOUND;
  }
  if (error.name === 'NotSupportedError') {
    return VoiceErrorCode.BROWSER_NOT_SUPPORTED;
  }
  return VoiceErrorCode.UNKNOWN_ERROR;
}

/**
 * Determine error code from WebSocket error
 * @param {Event|Error} error - WebSocket error event
 * @returns {string} - VoiceErrorCode
 */
export function getWebSocketErrorCode(error) {
  // Check for specific error messages
  const message = error?.message?.toLowerCase() || '';

  if (message.includes('401') || message.includes('unauthorized') || message.includes('token')) {
    return VoiceErrorCode.TOKEN_EXPIRED;
  }
  if (message.includes('429') || message.includes('rate limit')) {
    return VoiceErrorCode.RATE_LIMITED;
  }
  if (message.includes('network') || message.includes('connection')) {
    return VoiceErrorCode.NETWORK_ERROR;
  }

  return VoiceErrorCode.STT_CONNECTION_FAILED;
}

/**
 * Determine error code from fetch/TTS error
 * @param {Response|Error} error - Fetch response or error
 * @returns {string} - VoiceErrorCode
 */
export function getTTSErrorCode(error) {
  if (error instanceof Response) {
    if (error.status === 401) return VoiceErrorCode.TOKEN_EXPIRED;
    if (error.status === 429) return VoiceErrorCode.RATE_LIMITED;
  }

  const message = error?.message?.toLowerCase() || '';
  if (message.includes('network') || message.includes('fetch')) {
    return VoiceErrorCode.NETWORK_ERROR;
  }

  return VoiceErrorCode.TTS_GENERATION_FAILED;
}

export default {
  VoiceError,
  VoiceErrorCode,
  createVoiceError,
  getMediaErrorCode,
  getWebSocketErrorCode,
  getTTSErrorCode,
};
