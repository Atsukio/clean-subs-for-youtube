const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["content.js"],
    languageOptions: { sourceType: "script", globals: globals.browser },
  },
  {
    files: ["scripts/**/*.js", "eslint.config.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
];
