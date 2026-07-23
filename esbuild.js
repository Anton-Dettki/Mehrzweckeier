const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  minify: production,
  sourcemap: !production,
  platform: 'node',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  logLevel: 'info'
};

async function main() {
  if (watch) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log('Watching Mehrzweckeier extension...');
    return;
  }

  await esbuild.build(buildOptions);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
