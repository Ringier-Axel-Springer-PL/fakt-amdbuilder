module.exports = {
    root: true,
    parser: 'babel-eslint',
    env: {
        'node': true,
        'browser': true
    },
    extends: 'eslint-config-dl-js',
    plugins: ['import'],
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: '2017'
    },
    rules: {},
    globals: {}
};
