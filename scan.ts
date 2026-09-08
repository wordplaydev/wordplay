import { splitMarkupAndCode } from '@util/verify-locales/protect';
import fs from 'fs';

const ko = JSON.parse(
    fs.readFileSync('static/locales/ko-KR/ko-KR.json', 'utf8'),
);
const rows: {
    path: string;
    inCode: boolean;
    inMarkup: boolean;
    value: string;
}[] = [];
function walk(o: unknown, path = '') {
    if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${path}.${i}`));
    else if (o && typeof o === 'object')
        for (const [k, v] of Object.entries(o))
            walk(v, path ? `${path}.${k}` : k);
    else if (typeof o === 'string' && o.includes('암호')) {
        const segs = splitMarkupAndCode(o);
        rows.push({
            path,
            inCode: segs.some(
                (s) => s.kind === 'code' && s.text.includes('암호'),
            ),
            inMarkup: segs.some(
                (s) => s.kind === 'markup' && s.text.includes('암호'),
            ),
            value: o,
        });
    }
}
walk(ko);
const code = rows.filter((r) => r.inCode);
console.log(`${rows.length} strings contain 암호`);
console.log(`  prose only : ${rows.filter((r) => !r.inCode).length}`);
console.log(`  inside code: ${code.length}`);
for (const r of code)
    console.log(
        `\n  ${r.path}  (also in prose: ${r.inMarkup})\n     ${r.value.replace(/\n/g, ' ⏎ ').slice(0, 200)}`,
    );
