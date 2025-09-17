const mocha = require('eslint-plugin-mocha');

module.exports = [
  ...require('@starryinternet/eslint-config-starry'),
  mocha.default.configs.recommended,
  {
    files: [ 'test/**' ],
    rules: {
      'mocha/no-mocha-arrows': 'off'
    }
  }
];
