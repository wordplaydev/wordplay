/**
 * Downscale the captured PNGs into WebP data URIs for the review page.
 *
 * Done in a browser canvas rather than with an image library because the repo
 * has none, and Playwright's Chromium is already a dependency — adding `sharp`
 * for one resize would be a native build in everyone's install.
 *
 * Usage: npx tsx tests/contactsheet/thumbnails.ts [outDir] [width]
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const OutDir =
    process.argv[2] ??
    process.env.CONTACT_SHEET_OUT ??
    path.resolve('build/contact-sheet');
const Width = Number(process.argv[3] ?? 480);

const shotsDir = path.join(OutDir, 'shots');
const tilesDir = path.join(OutDir, 'tiles');

/** What capture.spec.ts writes per tile; only `shots` is read, the rest is kept. */
const Tile = z.looseObject({
    shots: z.record(z.string(), z.string()).optional(),
});

if (!fs.existsSync(tilesDir)) {
    console.error(`No tiles in ${tilesDir}. Run the capture first.`);
    process.exit(1);
}

const tiles = fs
    .readdirSync(tilesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) =>
        Tile.parse(JSON.parse(fs.readFileSync(path.join(tilesDir, f), 'utf8'))),
    );

const browser = await chromium.launch();
const page = await browser.newPage();

/** Draw a PNG into a canvas at `Width` and hand back a WebP data URI. */
async function thumbnail(file: string): Promise<string | undefined> {
    const full = path.join(shotsDir, file);
    if (!fs.existsSync(full)) return undefined;
    const source = `data:image/png;base64,${fs.readFileSync(full).toString('base64')}`;
    return page.evaluate(
        async ([src, width]) => {
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = src;
            });
            // Cap the height too: a tall viewport shot at a fixed width is a
            // sliver in a grid, so crop to a readable aspect and let the tile
            // say that it is the top of the surface.
            const scale = width / image.width;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = Math.min(
                Math.round(image.height * scale),
                Math.round(width * 1.25),
            );
            const context = canvas.getContext('2d');
            if (context === null) return undefined;
            context.imageSmoothingQuality = 'high';
            context.drawImage(
                image,
                0,
                0,
                image.width,
                Math.round(canvas.height / scale),
                0,
                0,
                canvas.width,
                canvas.height,
            );
            return canvas.toDataURL('image/webp', 0.72);
        },
        [source, Width] as const,
    );
}

let count = 0;
const sheet = [];
for (const tile of tiles) {
    const thumbs: Record<string, string> = {};
    for (const [variant, file] of Object.entries(tile.shots ?? {})) {
        const uri = await thumbnail(file);
        if (uri !== undefined) {
            thumbs[variant] = uri;
            count += 1;
        }
    }
    sheet.push({ ...tile, thumbs });
}

await browser.close();

fs.writeFileSync(
    path.join(OutDir, 'sheet.json'),
    JSON.stringify(
        { generated: new Date().toISOString(), tiles: sheet },
        null,
        2,
    ),
);

const bytes = sheet.reduce(
    (sum, t) => sum + Object.values(t.thumbs).reduce((s, u) => s + u.length, 0),
    0,
);
console.log(
    `${count} thumbnails across ${sheet.length} tiles, ${(bytes / 1e6).toFixed(2)}MB of data URI → ${path.join(OutDir, 'sheet.json')}`,
);
