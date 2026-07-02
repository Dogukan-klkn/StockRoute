// ESLint 8'in shareable-config isim çözümlemesi `@scope/eslint-config-*`
// kalıbını beklediğinden, paketi mutlak dosya yoluyla (require.resolve) devralıyoruz.
module.exports = {
  extends: [require.resolve('@stockroute/config')],
  env: {
    browser: true,
  },
  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
};
