import fs from 'fs';

export default function teardown() {
    fs.rmSync('playwright/.auth', { recursive: true, force: true });
}
