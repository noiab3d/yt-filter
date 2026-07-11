import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');
// TODO: adicionar 'chrome' quando manifest.chrome.json existir (sessão 6).
const targets = ['firefox'];

async function buildTarget(target) {
  const outdir = `dist/${target}`;
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });

  cpSync(`manifest.${target}.json`, `${outdir}/manifest.json`);
  cpSync('icons', `${outdir}/icons`, { recursive: true });

  const buildOptions = {
    entryPoints: [
      { in: 'src/content/index.js', out: 'content' },
    ],
    outdir,
    bundle: true,
    format: 'iife',
    target: 'es2020',
    loader: { '.css': 'text' },
    logLevel: 'info',
  };

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
  } else {
    await esbuild.build(buildOptions);
  }
}

for (const target of targets) {
  await buildTarget(target);
}

if (watch) {
  console.log('esbuild a vigiar mudanças (Ctrl+C para sair)...');
}
