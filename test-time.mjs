import { execSync } from 'child_process';

const t0 = performance.now();
execSync('npm run locales > /dev/null 2>&1', { cwd: '/Users/amyko/Code/wordplay' });
const elapsed = performance.now() - t0;
console.log(`elapsed: ${(elapsed / 1000).toFixed(2)}s`);
