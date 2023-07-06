import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: 'src/index.mjs',  // your main entry point
    output: {
        file: 'dist/earthatile.js', // output bundled file
        format: 'umd',  // output type is UMD
        name: 'earthatile' // the global variable name for your library
    },
    plugins: [
        nodeResolve(), // so Rollup can find external modules
        commonjs() // so Rollup can convert CommonJS to ES6
    ]
};
