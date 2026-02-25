module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
  },
  extends: ["eslint:recommended"],
  rules: {
    "no-console": "off",       // console.log/error are intentional in a server
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
