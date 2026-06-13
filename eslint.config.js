export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "test/fixtures/**",
      "**/*.ts",
      "**/*.tsx",
    ],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
];
