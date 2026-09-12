import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { getTestFirestore } from '../helpers/firestore';

/**
 * Wait until the stored kit satisfies `check`, so a test never races `kitEdited`.
 *
 * That trigger owns `words`, `moderation` and the listing decision, and it runs on Admin
 * SDK writes too — a fixture cannot write its way past it.
 */
async function waitForKit(
    id: string,
    check: (data: FirebaseFirestore.DocumentData) => boolean,
    what: string,
) {
    await expect
        .poll(
            async () => {
                const stored = await getTestFirestore()
                    .collection('kits')
                    .doc(id)
                    .get();
                const data = stored.data();
                return data !== undefined && check(data);
            },
            { timeout: 20000, message: `the kit never ${what}` },
        )
        .toBe(true);
}

/**
 * A kit reference has to be *drawn*, not merely parsed.
 *
 * `BorrowView` names each field it renders, so a field it doesn't name is invisible —
 * and that is exactly what happened to `↓ @amy/colors`: the model, the code, and every
 * unit test were correct, and the editor showed a bare `↓`. Nothing below the browser
 * could catch it, which is why this is an e2e test.
 */
test('a kit reference is visible in the editor', async ({ page }) => {
    await createTestProject(page);
    const editor = page.locator('[data-testid="editor"]').first();
    await editor.click();
    await page.keyboard.press(
        process.platform === 'darwin' ? 'Meta+a' : 'Control+a',
    );
    await page.keyboard.press('Backspace');
    await page.keyboard.type('↓ @amy/colors 3', { delay: 40 });

    // The zero-width spaces the editor renders between tokens are stripped.
    await expect
        .poll(async () => (await editor.innerText()).replace(/[\u200b]/g, ''))
        .toContain('↓ @amy/colors 3');
});

/**
 * Adding a borrow to a project that is already open has to fetch the kit.
 *
 * Resolving only on load would leave `↓ @amy/colors 1` doing nothing until the next
 * reload, which reads as the feature being broken — and no unit test can see it, because
 * the fetch, the debounce, and the re-render are all browser behavior.
 */
test('a kit borrowed into an open project resolves', async ({ page }) => {
    test.setTimeout(180000);
    const db = getTestFirestore();
    // A real UUID: `Kit`'s schema requires one, and a document that fails to parse used
    // to read as "no such kit" — which is how this test once passed for the wrong reason.
    const id = '0f6a2b1c-9d4e-4a7b-8c31-5e2f7a9b1d04';
    await db
        .collection('kits')
        .doc(id)
        .set({
            v: 1,
            id,
            owner: 'anyone',
            name: 'amy/colors',
            aliases: [],
            collaborators: [],
            description: 'Colours.',
            latest: 1,
            versionCount: 1,
            public: true,
            moderation: 'approved',
            moderatedAt: null,
            flags: {
                dehumanization: null,
                violence: null,
                disclosure: null,
                misinformation: null,
            },
            words: ['colors'],
            exports: ['sunset'],
            kinds: ['Number'],
            updated: Date.now(),
            originProject: null,
        });
    await db
        .collection('kitversions')
        .doc(`${id}_1`)
        .set({
            v: 1,
            id: `${id}_1`,
            kit: id,
            version: 1,
            owner: 'anyone',
            name: 'amy/colors',
            public: true,
            sourceName: 'colors/en',
            code: '↑ sunset/en: 1',
            locales: ['en-US'],
            exports: ['sunset'],
            created: Date.now(),
        });

    await createTestProject(page);
    const editor = page.locator('[data-testid="editor"]').first();
    await editor.click();
    await page.keyboard.press(
        process.platform === 'darwin' ? 'Meta+a' : 'Control+a',
    );
    await page.keyboard.press('Backspace');
    await page.keyboard.type('↓ @amy/colors 1\nsunset', { delay: 30 });

    await expect(editor).toContainText('@amy/colors');

    // Assert what the kit *gives*, never the absence of an error: `not.toContainText`
    // succeeds the instant before the error appears, so an absence assertion here passes
    // against a kit that never resolves. The kit shares `sunset: 1`, so a resolved borrow
    // puts a 1 on the stage — which can only happen if the fetch, the parse, and the
    // binding all worked. (Checked by pointing this at a kit that doesn't exist: it fails.)
    await expect(page.getByTestId('output').first()).toContainText('1', {
        timeout: 40000,
    });
});

/**
 * A kit's documentation has a page to read it on.
 *
 * The registry tile and the version list both link here, and it is rendered by the same
 * concept views the guide uses for a borrowed kit's exports — so what this asserts is
 * that the whole chain works in a browser: fetch the kit by name, fetch its version,
 * parse its code into a throwaway project, build concepts, and render them.
 *
 * Asserts what is *present*, never the absence of an error: an absence assertion here
 * succeeds in the moment before anything has loaded, which is how last round's resolution
 * test went green against a feature that never worked.
 */
test("a kit's page renders its exports", async ({ page }) => {
    const db = getTestFirestore();
    const id = '3b7c1d92-4e6a-4f18-9b52-0c8d3a6e17f4';
    const name = 'amy/palette';
    await db
        .collection('kits')
        .doc(id)
        .set({
            v: 1,
            id,
            owner: 'anyone',
            name,
            aliases: [],
            collaborators: [],
            description: 'Warm colours.',
            latest: 1,
            versionCount: 1,
            public: true,
            // A publish is a request, not a decision. `kitEdited` recomputes these on
            // every create — `claimChanged` is true whenever `before` is undefined — so a
            // fixture that claims approval here is overwritten and then races the trigger
            // for whichever the registry's query sees first.
            moderation: 'pending',
            moderatedAt: null,
            flags: {
                dehumanization: null,
                violence: null,
                disclosure: null,
                misinformation: null,
            },
            words: [],
            exports: ['sunset'],
            kinds: ['Number'],
            listed: false,
            listedVersion: null,
            updated: Date.now(),
            originProject: null,
        });
    await db
        .collection('kitversions')
        .doc(`${id}_1`)
        .set({
            v: 1,
            id: `${id}_1`,
            kit: id,
            version: 1,
            owner: 'anyone',
            name,
            public: true,
            sourceName: 'palette/en',
            code: '¶Warm colours. \\1\\¶\n1\n¶The colour of dusk.¶\n↑ dusk/en: 2',
            locales: ['en-US'],
            exports: ['dusk'],
            created: Date.now(),
        });

    // `kitEdited` rebuilds `words`, which is how we know it has seen the create and had
    // its say about the listing.
    await waitForKit(
        id,
        (kit) => Array.isArray(kit.words) && kit.words.length > 0,
        'was indexed',
    );

    // Now approve it, as the moderate callable does. Name, description, exports, kinds and
    // latest are all unchanged, so `claimChanged` and `versionAdded` are both false and the
    // trigger leaves the decision alone rather than sending it back to pending.
    await db.collection('kits').doc(id).update({
        moderation: 'approved',
        listed: true,
        listedVersion: 1,
    });
    await waitForKit(
        id,
        (kit) => kit.listed === true && kit.moderation === 'approved',
        'stayed listed',
    );

    await page.goto(`/guide?kit=${encodeURIComponent(name)}`);

    // The kit's own name, its doc, and the export's name and doc — each of which can
    // only appear if a different link in the chain above held.
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Warm colours.').first()).toBeVisible();
    await expect(page.getByText('The colour of dusk.').first()).toBeVisible();

    // And reached the way a reader actually reaches it: by following a link from inside
    // the guide, which is a client-side navigation rather than a fresh mount. Arriving
    // by URL exercises only the mount, which is why this went unnoticed — the guide read
    // the kit param on mount and on back/forward and nowhere else, so following a tile
    // left the browser showing and then rewrote the URL without the param.
    await page.goto('/guide?section=kits');
    const tile = page
        .locator(`a[href*="kit=${encodeURIComponent(name)}"]`)
        .first();
    await expect(tile).toBeVisible({ timeout: 30000 });
    await tile.click();

    // The href is written encoded (`amy%2Fpalette`) and the address bar keeps it that way.
    await expect(page).toHaveURL(new RegExp(`kit=${encodeURIComponent(name)}`));
    await expect(page.getByText('The colour of dusk.').first()).toBeVisible({
        timeout: 30000,
    });
});
