module.exports = {
  extends: ['@stockroute/config/.eslintrc.js'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
