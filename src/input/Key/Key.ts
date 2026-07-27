import createStreamEvaluator from '@input/createStreamEvaluator';
import { WellKnownKeys, type KeyMap } from '@input/Key/KeyboardKeys';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import SingletonStreamValue from '@values/SingletonStreamValue';
import TextValue from '@values/TextValue';

/** Look up the locale's keyboard-key-name table. Bundled in the main locale
 *  JSON under `ui.input.Key.keys` (see InputTexts.ts), so it's synchronously
 *  available wherever a `Locales` is. */
function getKeyMap(locales: Locales): KeyMap {
    return (locales.getLocale().input.Key.keys ?? {}) as KeyMap;
}

/** Localize the browser's English `event.key` to the primary locale's display
 *  name. Falls back to the canonical English value if the key isn't in the
 *  curated WellKnownKeys list or the locale's table lacks it. */
function localizeKeyName(canonicalEnglish: string, locales: Locales): string {
    const map = getKeyMap(locales);
    const entry = map[canonicalEnglish];
    return entry && entry.length > 0 ? entry[0] : canonicalEnglish;
}

/** Resolve a user-supplied `key` filter (typed by the author in any locale)
 *  back to the canonical English `KeyboardEvent.key` value. Walks every
 *  loaded locale's key table — so a French program's `Key('Espace')` resolves
 *  against the French map, while an English program's `Key('Space')` matches
 *  via the English alias.
 *
 *  Returns the canonical key when an alias is recognized; otherwise returns
 *  the input unchanged (correct for printable characters like 'a', '1', '!',
 *  any single Unicode grapheme — those don't need aliasing). */
export function canonicalizeKeyName(userKey: string, locales: Locales): string {
    for (const locale of locales.getLocales()) {
        const map = (locale.input.Key.keys ?? {}) as KeyMap;
        for (const [canonical, aliases] of Object.entries(map)) {
            if (aliases.some((a) => a === userKey)) return canonical;
        }
    }
    return userKey;
}

/** Type union for `Key()`'s emitted type and the `keyBind` parameter type.
 *  One literal-text type per WellKnownKeys entry, materialized in the
 *  primary locale's display name. Literal-text types are NOT language-
 *  tagged — the text itself is enough to identify the key, and a language
 *  tag would gum up downstream type matching (`TextType.acceptsAll`
 *  requires tag equality when present).
 *
 *  The trailing untagged `TextType.make()` is a catch-all so printable
 *  characters (`'a'`, `'!'`, any single Unicode grapheme) still type-check.
 *
 *  The type IS the documentation: hovering `Key()` shows the literal
 *  options, and Wordplay's autocomplete surfaces them when the caret is
 *  inside any text-typed slot whose expected type is this union — including
 *  `Key('|')` and `Key() = _`. */
function buildKeyTypeUnion(locales: Locales): Type {
    const map = getKeyMap(locales);
    const literals: Type[] = WellKnownKeys.map((canonical) =>
        TextType.make(map[canonical]?.[0] ?? canonical),
    );
    // Catch-all untagged Text. The reduce-fold mirrors UnionType.ts's own
    // pattern (see UnionType.ts:240-246).
    const all: Type[] = [...literals, TextType.make()];
    return all.reduce((acc, t) => UnionType.make(acc, t));
}

export default class Key extends SingletonStreamValue<
    TextValue,
    { key: string; down: boolean }
> {
    readonly evaluator: Evaluator;
    on = false;

    key: string | undefined;
    down: boolean | undefined;

    constructor(
        evaluation: Evaluation,
        key: string | undefined,
        down: boolean,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Key,
            new TextValue(evaluation.getCreator(), ''),
            { key: '', down: false },
        );

        this.evaluator = evaluation.getEvaluator();
        this.key = key;
        this.down = down;
    }

    configure(key: string | undefined, down: boolean | undefined) {
        this.key = key;
        this.down = down;
    }

    /** Locale data sourced from the project's preferred locales — same
     *  `Locales` the basis was built with. */
    private getLocales(): Locales {
        return this.evaluator.project.basis.locales;
    }

    /** True if this stream's `key` filter (in any loaded locale) names the
     *  same canonical key as `eventKey`. For printable characters the filter
     *  falls back to literal equality. */
    private matchesFilter(eventKey: string): boolean {
        if (this.key === undefined) return true;
        const canonical = canonicalizeKeyName(this.key, this.getLocales());
        return canonical === eventKey;
    }

    react(event: { key: string; down: boolean }) {
        if (
            this.on &&
            this.matchesFilter(event.key) &&
            (this.down === undefined || this.down === event.down)
        )
            this.add(
                new TextValue(
                    this.creator,
                    localizeKeyName(event.key, this.getLocales()),
                ),
                event,
            );
    }

    start() {
        this.on = true;
    }
    stop() {
        this.on = false;
    }

    getType() {
        return StreamType.make(buildKeyTypeUnion(this.getLocales()));
    }
}

export function createKeyDefinition(locales: Locales) {
    // Each slot below that consumes the union calls `buildKeyTypeUnion`
    // separately so the AST nodes aren't shared across child positions —
    // the basis is cached statically via `Basis.Bases`, so sharing the
    // same Type tree across multiple slots would let `Root.walk` overwrite
    // parent entries on shared nodes.

    // Filter parameter accepts any well-known key's localized name OR a
    // printable character (via the catch-all in the union), OR None.
    const keyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Key.key.doc),
        getNameLocales(locales, (locale) => locale.input.Key.key.names),
        UnionType.make(buildKeyTypeUnion(locales), NoneType.make()),
        // Default to none, allowing all keys
        NoneLiteral.make(),
    );

    const downBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Key.down.doc),
        getNameLocales(locales, (locale) => locale.input.Key.down.names),
        UnionType.make(BooleanType.make(), NoneType.make()),
        // Default to all events
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Key.doc),
        getNameLocales(locales, (locale) => locale.input.Key.names),
        [keyBind, downBind],
        createStreamEvaluator(
            buildKeyTypeUnion(locales),
            Key,
            (evaluation) =>
                new Key(
                    evaluation,
                    evaluation.get(keyBind.names, TextValue)?.text,
                    evaluation.get(downBind.names, BoolValue)?.bool ?? true,
                ),
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(keyBind.names, TextValue)?.text,
                    evaluation.get(downBind.names, BoolValue)?.bool ?? true,
                ),
        ),
        buildKeyTypeUnion(locales),
    );
}
