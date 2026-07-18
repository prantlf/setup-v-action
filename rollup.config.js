import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import pkg from './package.json' with { type: 'json' }
import builtins from 'builtins'

export default {
  input: 'src/index.js',
  output: { file: pkg.main, sourcemap: true },
  plugins: [json(), commonjs(), nodeResolve({ preferBuiltins: true })],
  external: builtins()
}
