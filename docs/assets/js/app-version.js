(() => {
  "use strict";
  // Internal build/cache version stays unique so older v2.0.0 caches cannot be reused.
  globalThis.PINKY_BUILD_VERSION = "2.4.6";
  globalThis.PINKY_APP_VERSION = "2.4.6";
  // User-facing product version.
  globalThis.PINKY_DISPLAY_VERSION = "2.0.0";
})();
