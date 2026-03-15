// Converts the CHANGELOG into a JSON file for use in the app to render release notes.

import fs from 'fs';
import path from 'path';

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const outputPath = path.join(
    process.cwd(),
    'src',
    'routes',
    'updates',
    'updates.json',
);
const datePath = path.join(
    process.cwd(),
    'src',
    'routes',
    'updates',
    'date.json',
);

function parseChangelog(changelog) {
    const lines = changelog.split('\n');
    const updates = [];
    let currentType = null;
    let currentUpdate = null;

    lines.forEach((line) => {
        const versionMatch =
            line.match(/^## (\d+\.\d+\.\d+) - (\d{4}-\d{2}-\d{2})$/) ??
            line.match(/^## (\d+\.\d+\.\d+)$/);

        const typeofChangeMatch = line.match(
            /^### (Added|Fixed|Changed|Removed)$/,
        );
        if (typeofChangeMatch) {
            currentType = typeofChangeMatch[1];
        } else if (versionMatch) {
            const version = versionMatch[1];
            const date = versionMatch[2] || null;

            // Save the previous update before starting a new one
            if (currentUpdate) {
                updates.push(currentUpdate);
            }
            currentUpdate = {
                version: version,
                date: date,
                changes: { added: [], fixed: [], changed: [], removed: [] },
            };
        } else if (currentUpdate && line.startsWith('- ')) {
            currentUpdate.changes[currentType.toLowerCase()].push(
                line.substring(2).trim(),
            );
        }
    });

    if (currentUpdate) {
        updates.push(currentUpdate);
    }

    return updates;
}

console.log('Parsing changelog...');

const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
const updates = parseChangelog(changelogContent);
fs.writeFileSync(outputPath, JSON.stringify(updates, null, 2), 'utf-8');

fs.writeFileSync(
    datePath,
    JSON.stringify({ date: updates[0].date }, null, 2),
    'utf-8',
);

console.log(`Saved JSON to ${outputPath}`);
