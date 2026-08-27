import { Units, unitFor, type UnitKey } from '@basis/UnitConversions';
import type Locales from '@locale/Locales';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import Dimension from '@nodes/Dimension';
import Markup from '@nodes/Markup';
import type Node from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';

/**
 * The localized name of the unit a menu suggestion would insert, e.g. `km` → "kilometers".
 *
 * Every unit suggestion otherwise shares one generic note ("I am a unit of measurement!"),
 * which is the same sentence for all 252 of them and so distinguishes none of them. The
 * names already exist in every locale — they were written for conversion documentation —
 * so this only has to find the right key.
 */

/** Each built-in unit's Wordplay text mapped to its key in `Units`.
 *
 *  Keyed on the unit's *text* rather than its key in the table, because the two differ:
 *  the key `us` names the dimension `µs`, `mps` names `m/s`, and `m2` names `m^2`. Built
 *  on first use, like `Unit.Empty`, since constructing a Unit walks the Unit/Dimension
 *  import cycle. */
let KeysByUnit: Map<string, UnitKey> | undefined;

function getKeysByUnit(): Map<string, UnitKey> {
    if (KeysByUnit === undefined) {
        const map = new Map<string, UnitKey>();
        for (const key of Object.keys(Units).filter(
            (candidate): candidate is UnitKey => candidate in Units,
        ))
            map.set(unitFor(key).toWordplay(), key);
        KeysByUnit = map;
    }
    return KeysByUnit;
}

/** The unit a Dimension stands for on its own, e.g. `·m^2` → `m^2`. A dimension repeated
 *  by its exponent is how the table spells powers (`m2` is `['m','m']`), so this matches
 *  area and volume units too. */
function unitForDimension(dimension: Dimension): Unit | undefined {
    const name = dimension.getName();
    if (name === undefined) return undefined;
    const exponent =
        dimension.exponent === undefined
            ? 1
            : Number.parseInt(dimension.exponent.getText());
    // Powers beyond the table's cubes can't name a unit, and a non-positive or
    // unparseable one isn't a dimension we can rebuild.
    if (!Number.isInteger(exponent) || exponent < 1 || exponent > 3)
        return undefined;
    return Unit.create(new Array(exponent).fill(name));
}

/** The `Units` key a node names, if it names one. Covers the three kinds the unit menu
 *  offers: a whole `Unit` (`m/s`), a single `Dimension` (`·km`), and a `NumberLiteral`
 *  carrying a unit. A creator's own unit (`1cat`) isn't in the table, so it returns
 *  undefined and the caller keeps the node's own doc. */
export function getUnitKey(node: Node): UnitKey | undefined {
    const unit =
        node instanceof Unit
            ? node
            : node instanceof NumberLiteral
              ? node.unit
              : node instanceof Dimension
                ? unitForDimension(node)
                : undefined;
    return unit === undefined
        ? undefined
        : getKeysByUnit().get(unit.toWordplay());
}

/** A unit's name in one set of locales, or undefined if that locale doesn't name it. */
export function getUnitName(
    key: UnitKey,
    locales: Locales,
): string | undefined {
    const text = locales.getWithAnnotations((l) => l.basis.Number.unit[key]);
    if (typeof text !== 'string') return undefined;
    const name = withoutAnnotations(text).trim();
    return name.length === 0 ? undefined : name;
}

/** A unit's name as markup, resolved per locale so `MarkupHTMLView` echoes it in each
 *  chosen locale — primary first, the rest dimmed, each with its own language and
 *  direction. Returns undefined when no chosen locale names the unit. */
export function getUnitNameMarkup(
    key: UnitKey,
    locales: Locales,
): { perLocale: (locales: Locales) => Markup | undefined } | undefined {
    if (getUnitName(key, locales) === undefined) return undefined;
    return {
        perLocale: (view) => {
            const name = getUnitName(key, view);
            return name === undefined ? undefined : Markup.words(name);
        },
    };
}
