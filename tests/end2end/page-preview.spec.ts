import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';
import { getTestFirestore } from '../helpers/firestore';

/**
 * The getPagePreview/getSitemap functions (#1133): project and gallery URLs
 * are rewritten by hosting to a function that injects <title>/og:* metadata
 * for public docs into the SPA shell, reading Firestore over REST with no
 * credentials so security rules decide visibility. These tests run through
 * the hosting emulator, exercising the rewrite, the function, and the rules.
 */

const PUBLIC_ID = 'e2epreviewpublic00000000000001';
const PRIVATE_ID = 'e2epreviewprivate0000000000001';
const HOSTILE_ID = 'e2epreviewhostile0000000000001';
const GALLERY_ID = 'e2epreviewgallery0000000000001';
const PRIVATE_NAME = 'Extremely Secret Preview Project';

test.beforeAll(async () => {
    const firestore = getTestFirestore();
    await firestore.collection('projects').doc(PUBLIC_ID).set({
        name: 'E2E Preview Project',
        public: true,
        listed: true,
        archived: false,
    });
    await firestore.collection('projects').doc(PRIVATE_ID).set({
        name: PRIVATE_NAME,
        public: false,
        listed: true,
        archived: false,
    });
    await firestore.collection('projects').doc(HOSTILE_ID).set({
        name: '</title><script>window.hacked=true</script>',
        public: true,
        listed: true,
        archived: false,
    });
    await firestore
        .collection('galleries')
        .doc(GALLERY_ID)
        .set({
            public: true,
            name: { 'en-US': 'E2E Preview Gallery', 'es-MX': 'Galería E2E' },
            description: { 'en-US': 'A gallery for preview tests.' },
        });
});

test('a public project URL serves its name in title and og tags', async ({
    request,
}) => {
    const response = await request.get(`/project/${PUBLIC_ID}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>E2E Preview Project</title>');
    expect(html).toContain(
        '<meta name="title" property="og:title" content="E2E Preview Project" />',
    );
    expect(html).toContain(`/project/${PUBLIC_ID}`);
});

test('a private project URL leaks nothing', async ({ request }) => {
    const response = await request.get(`/project/${PRIVATE_ID}`);
    // Same status and shell as before this feature existed.
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).not.toContain(PRIVATE_NAME);
    expect(html).not.toContain('<title>');
});

test('a hostile project name is escaped', async ({ request }) => {
    const html = await (await request.get(`/project/${HOSTILE_ID}`)).text();
    expect(html).not.toContain('<script>window.hacked');
    expect(html).toContain('&lt;script&gt;');
});

test('a public gallery serves localized name and description', async ({
    request,
}) => {
    const english = await (await request.get(`/gallery/${GALLERY_ID}`)).text();
    expect(english).toContain('<title>E2E Preview Gallery</title>');
    expect(english).toContain('A gallery for preview tests.');

    const spanish = await (
        await request.get(`/es-MX/gallery/${GALLERY_ID}`)
    ).text();
    expect(spanish).toContain('<title>Galería E2E</title>');
});

test('a built-in example project serves its .wp name', async ({ request }) => {
    const html = await (
        await request.get('/project/example-HeartAttack')
    ).text();
    expect(html).toContain('<title>Heart Attack</title>');
});

test('a built-in example gallery serves locale-JSON names', async ({
    request,
}) => {
    // en-US text ships inside the function; sync-tested against en-US.json.
    const english = await (await request.get('/gallery/Games')).text();
    expect(english).toContain('<title>Games</title>');
    expect(english).toContain('Interactive games with words and symbols.');

    // Other locales come from hosting's own static locale JSON.
    const esMX = JSON.parse(
        readFileSync(
            path.join('static', 'locales', 'es-MX', 'es-MX.json'),
            'utf8',
        ),
    ) as { gallery: { games: { name: string } } };
    const expected = esMX.gallery.games.name
        .replace(/\$\?|\$!|\$~/g, '')
        .trim();
    const spanish = await (await request.get('/es-MX/gallery/Games')).text();
    expect(spanish).toContain(`<title>${expected}</title>`);
});

test('non-preview routes still serve the untouched static shell', async ({
    request,
}) => {
    const html = await (await request.get('/guide')).text();
    expect(html).not.toContain('<title>');
    expect(html).toContain(
        'content="Wordplay: Accessible, Multilingual, Programmable Typography"',
    );
});

test('the sitemap lists public content and omits private content', async ({
    request,
}) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/xml');
    const xml = await response.text();
    expect(xml).toContain(`/project/${PUBLIC_ID}`);
    expect(xml).toContain(`/gallery/${GALLERY_ID}`);
    expect(xml).toContain('/gallery/Games');
    expect(xml).toContain('/project/example-HeartAttack');
    expect(xml).toContain('/guide');
    expect(xml).not.toContain(PRIVATE_ID);
});
