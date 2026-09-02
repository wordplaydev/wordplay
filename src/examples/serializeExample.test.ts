import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { parseSerializedProject } from './examples';
import { serializeExample } from './serializeExample';

const dir = path.join('static', 'examples');
const files = readdirSync(dir, { withFileTypes: true })
    .filter((file) => file.isFile() && file.name.endsWith('.wp'))
    .map((file) => file.name);

// Byte equality is the strongest possible framing proof: if the serializer
// reproduced every master exactly, then parse ∘ serialize ∘ parse is identity
// for anything the parser accepts, including the pipeline's translated files.
test.each(files)('%s round-trips through serializeExample', (name) => {
    const text = readFileSync(path.join(dir, name), 'utf8');
    const parsed = parseSerializedProject(text, name.split('.')[0]);
    const serialized = serializeExample(
        parsed.preview?.text,
        parsed.name,
        parsed.sources,
    );
    expect(serialized).toBe(text);
});

test('an explicit locales list overrides header-derived tags', () => {
    const text = `Y\n"Test"\n=== start/en\n1 + 1\n`;
    const derived = parseSerializedProject(text, 'test');
    expect(derived.locales).toEqual(['en']);
    const explicit = parseSerializedProject(text, 'test', ['es-MX']);
    expect(explicit.locales).toEqual(['es-MX']);
    // An empty override falls back to derivation rather than declaring nothing.
    const empty = parseSerializedProject(text, 'test', []);
    expect(empty.locales).toEqual(['en']);
});
