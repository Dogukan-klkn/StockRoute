// ESLint 8'in shareable-config isim çözümlemesi `@scope/eslint-config-*`
// kalıbını beklediğinden, paketi mutlak dosya yoluyla (require.resolve) devralıyoruz
// (web/api ile aynı desen).
module.exports = {
  extends: [require.resolve('@stockroute/config')],
  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
};
