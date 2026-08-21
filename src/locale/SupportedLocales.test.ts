import { expect, test } from 'vitest';
import { getManifestPath } from './SupportedLocales';

test('names the locale’s own manifest', () => {
    expect(getManifestPath('es-MX')).toBe('/manifests/es-MX.webmanifest');
    expect(getManifestPath('ta-IN-LK-SG')).toBe(
        '/manifests/ta-IN-LK-SG.webmanifest',
    );
});

test.each([
    ['a multilingual tag, which is a locale but not a file', 'es_en-MX'],
    ['an unknown URL segment', 'xx-YY'],
    ['nothing at all', ''],
])('falls back to en-US rather than a 404 for %s', (_, code) => {
    expect(getManifestPath(code)).toBe('/manifests/en-US.webmanifest');
});
