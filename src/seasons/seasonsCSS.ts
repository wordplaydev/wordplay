import { SeasonPalettes } from './palettes.ts';
import { Seasons } from './Season.ts';

/**
 * The stylesheet that recolors the app for each season: raw-pair overrides
 * under `:root[data-season=…]`. Its specificity (0-2-0) beats the default
 * declarations on `:root` (0-1-0), and because every `--color-*` and
 * `--wordplay-*` token is composed from raw pairs on `:root`, overriding them
 * there is enough — light-dark() still picks the mode. hooks.server.ts inlines
 * this into every page, so a season costs no request and no flash.
 */
export function toSeasonsCSS(): string {
    return Seasons.map((season) => {
        const declarations = Object.entries(SeasonPalettes[season])
            .flatMap(([name, pair]) => [
                `--${name}-light:${pair.light}`,
                `--${name}-dark:${pair.dark}`,
            ])
            .join(';');
        return `:root[data-season="${season}"]{${declarations}}`;
    }).join('');
}
