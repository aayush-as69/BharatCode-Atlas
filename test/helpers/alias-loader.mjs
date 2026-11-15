import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const base = path.join(root, specifier.slice(2));
    const hit = [base, base + '.js', base + '.jsx', path.join(base, 'index.js')]
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (hit) return next(pathToFileURL(hit).href, context);
  }
  if (specifier === 'openai') {
    try {
      return await next(specifier, context);
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      return next(new URL('./openai-stub.mjs', import.meta.url).href, context);
    }
  }
  return next(specifier, context);
}

// Next's bundler imports JSON without an import attribute; Node requires one.
export async function load(url, context, next) {
  if (url.startsWith('file:') && url.endsWith('.json')) {
    const source = fs.readFileSync(fileURLToPath(url), 'utf8');
    return { format: 'module', source: 'export default ' + source + ';', shortCircuit: true };
  }
  return next(url, context);
}
