export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 99], // C11: < 100 chars
    'body-max-line-length': [2, 'always', 100],
  },
}
