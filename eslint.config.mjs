import nextConfig from 'eslint-config-next'

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // `_` marks something kept on purpose. Args already honoured that; vars
      // did not, which flagged `_isDayUnlockedOriginal` in src/lib/day-gating.ts
      // — the reference implementation the file's own comment says to keep for
      // restoring day pacing. Deleting it to satisfy the linter would throw away
      // the restoration path, so the convention is honoured for vars too.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]

export default eslintConfig
