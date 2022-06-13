module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-prettier',
    'stylelint-config-rational-order',
    'stylelint-config-recommended-vue',
    'stylelint-config-recommended-less',
  ],
  rules: {
    'at-rule-no-unknown': null,
    'no-descending-specificity': null,
    'color-no-invalid-hex': true,
    'less/color-no-invalid-hex': true,
    'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['v-deep'] }],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['deep'] }],
    'no-descending-specificity': null,
    'declaration-block-trailing-semicolon': null,
    'font-family-no-missing-generic-family-keyword': null,
  },
  overrides: [
    {
      files: ['**/*.less'],
      customSyntax: 'postcss-less',
    },
  ],
};
