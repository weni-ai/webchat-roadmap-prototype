let currentService = null;

export function setCurrentService(service) {
  currentService = service || null;
}

export function getCurrentService() {
  if (!currentService) {
    throw new Error('Service not initialized');
  }

  return currentService;
}
