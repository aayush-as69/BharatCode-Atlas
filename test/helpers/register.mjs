import { register } from 'node:module';

// Lets tests import Next-style modules ("@/lib/..." and JSON data) under plain Node.
register('./alias-loader.mjs', import.meta.url);
