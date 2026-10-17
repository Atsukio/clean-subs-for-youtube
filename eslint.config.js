const js = require("@eslint/js");
const globals = require("globals");

// Shared by the classic scripts (content scripts and the popup)
const extensionGlobals = { ...globals.browser, ...globals.webextensions, EFY: "readonly", EFY_CHANGELOG: "readonly" };

module.exports = [
  js.configs.recommended,
  {
    files: ["content/**/*.js", "ui/*.js", "lib/settings.js"],
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
    files: ["tools/**/*.js", "eslint.config.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  {
    files: ["tools/**/*.mjs"],
    languageOptions: { sourceType: "module", globals: globals.node },
  },
];
