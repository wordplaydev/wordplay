/**
 * Regenerates src/seasons/zoneSeasons.generated.ts from the committed climate
 * normals (#108). No network: fetchNormals.ts is the only step that has one.
 */
import { writeFileSync } from 'fs';
import { readNormals, toZoneTable, ZoneTablePath } from './zoneTable.ts';

writeFileSync(ZoneTablePath, toZoneTable(readNormals()));
console.log(`Wrote ${ZoneTablePath}`);
