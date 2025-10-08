import playcanvasConfig from '@playcanvas/eslint-config';
import globals from 'globals';

export default [
    ...playcanvasConfig,
    {
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.mocha,
                ...globals.node,
                'earthatile': 'readonly',
                'pc': 'readonly',
                'pcui': 'readonly'
            }
        }
    },
    {
        ignores: [
            'integrations/playcanvas/pcui-5.2.3.min.js'
        ]
    }
];
