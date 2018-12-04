module.exports = {
  env: {
    node: true,
    es6: true,
  },

  extends: `eslint:recommended`,

  parserOptions: {
    ecmaVersion: 2018,
    sourceType: `module`,
  },

  rules: {
    'no-debugger': [`warn`],
    'arrow-parens':                [`error`, `as-needed`],
    'camelcase':                   [`error`, {'properties': `always`}],
    'comma-dangle':                [`error`, `always-multiline`],
    'comma-spacing':               [`error`, {'before': false, 'after': true}],
    'eol-last':                    [`error`],
    'eqeqeq':                      [`error`],
    'indent':                      [`error`, 2],
    'key-spacing':                 ['error', {beforeColon: false, afterColon: true, mode: `minimum`}],
    'keyword-spacing':             [`error`],
    'linebreak-style':             [`error`, `unix`],
    'no-multi-spaces':             ['error'],
    'no-console':                  ['off'],
    'no-trailing-spaces':          [`error`],
    'no-unused-expressions':       [`warn`],
    'no-unused-vars':              [`error`],
    'no-use-before-define':        [`error`, {classes: false}],
    'object-curly-spacing':        [`error`, `never`],
    'object-shorthand':            [`error`, `always`],
    'quotes':                      [`error`, `backtick`],
    'semi':                        [`error`, `always`],
    'space-before-blocks':         [`error`, `always`],
    'space-before-function-paren': [`error`, {anonymous: `never`, named: `never`, asyncArrow: `always`}]
  },
};
