const js = require("@eslint/js");
const globals = require("globals");

// Shared by the classic scripts (content scripts and the popup)
const extensionGlobals = { ...globals.browser, ...globals.webextensions, EFY: "readonly" };

module.exports = [
  js.configs.recommended,
  {
    files: ["content/**/*.js", "popup/*.js", "lib/settings.js"],
    languageOptions: { sourceType: "script", globals: extensionGlobals },
  },
  {
    files: ["lib/settings.js"],
    languageOptions: { globals: { ...extensionGlobals, EFY: "writable" } },
  },
  {
    files: ["background/*.js", "lib/ids.js"],
    languageOptions: { sourceType: "module", globals: { ...globals.browser, ...globals.serviceworker, ...globals.webextensions } },
  },
  {
    files: ["scripts/**/*.js", "eslint.config.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
];
