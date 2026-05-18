const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const buildOptions = {
    entryPoints: ['src/extension/index.ts'],
    bundle: true,
    outfile: 'out/extension.js',
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    sourcemap: true,
    minify: production,
    logLevel: 'info',
    external: ['vscode']
};

const standaloneOptions = {
    entryPoints: ['src/standalone/index.ts'],
    bundle: true,
    outfile: 'out/standalone.js',
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    sourcemap: true,
    minify: production,
    logLevel: 'info',
    external: []
};

async function run() {
    if (watch) {
        const ctx1 = await esbuild.context(buildOptions);
        const ctx2 = await esbuild.context(standaloneOptions);
        await ctx1.watch();
        await ctx2.watch();
        console.log('[esbuild] watching...');
        return;
    }
    await Promise.all([
        esbuild.build(buildOptions),
        esbuild.build(standaloneOptions)
    ]);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
