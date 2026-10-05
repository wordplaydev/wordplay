# Seasons tooling

The data behind Auto season resolution (#108). See ARCHITECTURE.md's _Seasons_ section for how seasons work.

| Command                                             | What it does                                                                                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run seasons-build`                             | Regenerates `src/seasons/zoneSeasons.generated.ts` from `normals.json`. No network. `seasonsSync.test.ts` fails if they disagree.                                            |
| `npm run seasons-fetch`                             | Re-fetches `normals.json`. This needs the network and is rarely needed: only to move to a new tz release (`TzRelease` in `normals.ts`) or a new climatology.                 |
| `npx tsx scripts/seasons/derivePalette.ts [season]` | Suggests a season palette from one hue per role, at the luminance the default palette uses for that role. Paste the result into `src/seasons/palettes.ts` and adjust by eye. |

## Sources

- **Zones and coordinates**: the IANA tz database's `zone.tab` and `backward`, at the release pinned in `normals.ts`. Public domain.
- **Climate normals**: NASA POWER Climatology API, monthly climatology for 2001–2020 at each zone's representative coordinate. _These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program._
- **Classification**: Köppen-Geiger as stated by Peel et al. (2007) and Beck et al. (2018), computed in `classify.ts` from the normals themselves. Monsoon climates (Cw/Dw) live by their rains, so a month of 100 mm or more there is `wet` rather than a temperate season.
