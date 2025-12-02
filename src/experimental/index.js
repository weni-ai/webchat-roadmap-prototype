export function isExperimentalEnabled(feature) {
  try {
    return JSON.parse(localStorage.getItem('WeniWebChatExperimental'))[feature];
  } catch (error) {
    return false;
  }
}
