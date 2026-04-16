/**
 * API configuration — change this once after deploying your backend to Render.
 * In development, leave as 'http://localhost:3000'.
 * In production, set it to your Render URL, e.g. 'https://zekiel-apparel.onrender.com'.
 */
window.ZEKIEL_API_URL = (function () {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  // Production — update after deploying to Render
  return 'https://zekiel-apparel-api.onrender.com';
})();
