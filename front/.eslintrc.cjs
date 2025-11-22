module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true, // 👈 habilita describe, it, expect nos testes
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "react-hooks"],
  rules: {
    "no-unused-vars": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "no-undef": "error"
  },
  settings: {
    react: { version: "detect" }
  }
};
