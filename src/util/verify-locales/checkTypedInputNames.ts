import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { isUnwritten } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import Project from '@db/projects/Project';
import NameType from '@nodes/NameType';
import Source from '@nodes/Source';
import StructureDefinition from '@nodes/StructureDefinition';
import StreamDefinition from '@nodes/StreamDefinition';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import LocalePath from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import { leadingAnnotations } from '@util/verify-locales/protect';

/**
 * A type and the input that holds one should be the same word, as they are in English.
 *
 * `Phrase`'s `bubble` input takes a `Bubble`, and en-US deliberately names them alike. Each
 * is translated independently, though, so eleven locales ended up with two words — Japanese
 * `あわ` (froth) for the input against `吹き出し` (the comics speech balloon) for the type,
 * Korean `거품` (foam) against `말풍선`. One concept then reads as two, and when the words
 * diverge a localized example stops resolving (#1323).
 *
 * The pairs are **derived, not listed**: a type annotation like `` •ø|""|`…`|🔊|🗨 `` is
 * written in TypeScript, so the set is the same in every locale and can be read once off the
 * en-US basis. That matters because a purely textual rule ("the input is named like some
 * type") is wrong eighteen times over — `Phrase.face` is a typeface, not the `Face` camera
 * stream, and `Track.key` is a musical key, not the `Key` keyboard stream.
 *
 * Word choice is **never** repaired: the type is sometimes the mistranslation (tl-PH and
 * te-IN both render `Form` as a *paper* form, te-IN renders `Direction` as *film* direction),
 * so unifying onto it would make those locales worse. Only the case where the input has no
 * translation at all is filled in, from the word the locale already chose for the type.
 */

/** Whether a divergence should fail the run. False while the ~98 that need a native speaker
 *  are still outstanding; the same treatment `DelimiterDriftIsFatal` gives its backlog. */
export const TypedInputNamesAreFatal = false;

/** One input that should share its type's word, as paths into a locale file. */
export type TypedInput = {
    /** For messages: `Phrase.bubble`. */
    label: string;
    /** `output.Phrase.bubble.names`. */
    bind: LocalePath;
    /** `output.Bubble.names`. */
    type: LocalePath;
    /** For messages: `Bubble`. */
    typeLabel: string;
};

/** The names a `names` value holds, ignoring markers, symbols, and unwritten placeholders. */
function words(value: unknown): string[] {
    return (Array.isArray(value) ? value : [value])
        .filter((name): name is string => typeof name === 'string')
        .filter((name) => !isUnwritten(name))
        .map((name) => withoutAnnotations(name).normalize('NFC'))
        .filter((name) => /\p{L}/u.test(name));
}

function members(type: Type | undefined): Type[] {
    if (type === undefined) return [];
    if (type instanceof UnionType)
        return [...members(type.left), ...members(type.right)];
    return [type];
}

/**
 * Where a definition's names live in a locale file, found by its en-US name rather than by
 * the JSON key: four en-US binds disagree with their key (`output.Grid.cellHeight` is named
 * `cellpadding`, `output.Matter.shapes` is named `ground`), and the `createDefaultShares`
 * record keys disagree with the JSON section for `Downbeat`, `Part`, `Rebound`, `Direction`,
 * `Source`, and `Gesture`.
 */
function findNames(
    names: string[],
    within: Record<string, unknown>,
    path: (string | number)[],
): { key: string; path: LocalePath } | undefined {
    for (const [key, value] of Object.entries(within)) {
        if (value === null || typeof value !== 'object') continue;
        const declared = (value as Record<string, unknown>).names;
        if (declared === undefined) continue;
        if (words(declared).some((name) => names.includes(name)))
            return { key, path: new LocalePath(path, key, []) };
    }
    return undefined;
}

let derived: TypedInput[] | undefined;

/**
 * Every input whose declared type is a structure the input is already named after in en-US.
 * Computed once: the type annotations are code, so the answer doesn't vary by locale.
 */
export function getTypedInputs(): TypedInput[] {
    if (derived !== undefined) return derived;
    derived = [];

    const project = Project.make(
        null,
        'types',
        new Source('start', ''),
        [],
        DefaultLocale,
    );
    const context = project.getContext(project.getSources()[0]);
    const definitions = [
        ...project.basis.shares.all,
        ...project.basis.getAllStructureDefinitions(),
    ];

    const sections: Record<string, unknown> = {
        output: DefaultLocale.output,
        input: DefaultLocale.input,
    };

    for (const definition of definitions) {
        if (!(
            definition instanceof StructureDefinition ||
            definition instanceof StreamDefinition
        ))
            continue;
        const structureNames = words(definition.names.getNames());
        let structurePath: { key: string; section: string } | undefined;
        for (const [section, tree] of Object.entries(sections)) {
            if (tree === null || typeof tree !== 'object') continue;
            const found = findNames(
                structureNames,
                tree as Record<string, unknown>,
                [section],
            );
            if (found) {
                structurePath = { key: found.key, section };
                break;
            }
        }
        if (structurePath === undefined) continue;
        const structureTree = ((
            sections[structurePath.section] as Record<string, unknown>
        )[structurePath.key] ?? {}) as Record<string, unknown>;

        for (const bind of definition.inputs) {
            const bindNames = words(bind.names.getNames());
            if (bindNames.length === 0) continue;
            const bindEntry = findNames(bindNames, structureTree, [
                structurePath.section,
                structurePath.key,
            ]);
            if (bindEntry === undefined) continue;

            for (const member of members(bind.type)) {
                if (!(member instanceof NameType)) continue;
                const target = member.resolve(context);
                if (!(target instanceof StructureDefinition)) continue;
                const targetNames = words(target.names.getNames());
                // Only when en-US already names them alike; `Phrase.background` is a Color
                // and must stay `background`.
                if (
                    !targetNames.some((name) =>
                        bindNames.some(
                            (bindName) =>
                                bindName.toLowerCase() === name.toLowerCase(),
                        ),
                    )
                )
                    continue;
                let typePath: LocalePath | undefined;
                let typeKey: string | undefined;
                for (const [section, tree] of Object.entries(sections)) {
                    if (tree === null || typeof tree !== 'object') continue;
                    const found = findNames(
                        targetNames,
                        tree as Record<string, unknown>,
                        [section],
                    );
                    if (found) {
                        typePath = new LocalePath(
                            [section, found.key],
                            'names',
                            [],
                        );
                        typeKey = found.key;
                        break;
                    }
                }
                if (typePath === undefined || typeKey === undefined) continue;
                derived.push({
                    label: `${structurePath.key}.${bindEntry.key}`,
                    bind: new LocalePath(
                        [
                            structurePath.section,
                            structurePath.key,
                            bindEntry.key,
                        ],
                        'names',
                        [],
                    ),
                    type: typePath,
                    typeLabel: typeKey,
                });
            }
        }
    }
    return derived;
}

export default function checkTypedInputNames(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    const divergent: string[] = [];
    let filled = 0;
    for (const input of getTypedInputs()) {
        const bindValue = input.bind.resolve(revised);
        const typeValue = input.type.resolve(revised);
        if (bindValue === undefined || typeValue === undefined) continue;

        const bindNames = words(bindValue);
        const typeNames = words(typeValue);
        const lower = (names: string[]) =>
            names.map((name) => name.toLocaleLowerCase(target.language));
        // They already share a word, up to case — en-US's own pair is `bubble`/`Bubble`.
        if (lower(bindNames).some((name) => lower(typeNames).includes(name)))
            continue;

        // A name the locale only repeats from en-US isn't a name of its own; every project's
        // basis appends the en-US fallback, so it binds either way.
        const english = (path: LocalePath) =>
            lower(words(path.resolve(source)));
        const bindOwn = bindNames.filter(
            (name) =>
                !english(input.bind).includes(
                    name.toLocaleLowerCase(target.language),
                ),
        );
        const typeOwn = typeNames.filter(
            (name) =>
                !english(input.type).includes(
                    name.toLocaleLowerCase(target.language),
                ),
        );

        // The type isn't translated yet, so there is no word to disagree with — that's the
        // unwritten gate's business, not this one's.
        if (typeOwn.length === 0) continue;

        if (bindOwn.length === 0) {
            // The input has no word of its own, so take the type's. This is the one repair
            // here: adopting a word the locale already chose, not translating a new one.
            const word = typeOwn[0];
            const derivedName =
                word.charAt(0).toLocaleLowerCase(target.language) +
                word.slice(1);
            filled++;
            if (fix) {
                const marker = leadingAnnotations(
                    (Array.isArray(typeValue) ? typeValue[0] : typeValue) ?? '',
                );
                const kept = (
                    Array.isArray(bindValue) ? bindValue : [bindValue]
                ).filter(
                    (name) =>
                        !isUnwritten(name) &&
                        !english(input.bind).includes(
                            withoutAnnotations(name).toLocaleLowerCase(
                                target.language,
                            ),
                        ),
                );
                const next = [...kept, `${marker}${derivedName}`];
                input.bind.repair(
                    revised,
                    Array.isArray(bindValue) ? next : next[next.length - 1],
                );
            }
            continue;
        }

        divergent.push(
            `${input.label} = ${bindOwn[0]} vs ${input.typeLabel} = ${typeOwn[0]}`,
        );
    }

    if (filled > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Named ${filled} untranslated input(s) after the type they take.`
                : `${filled} input(s) whose type this locale has named are still the English word. Run "npm run locales-fix" to name them after their type.`,
        );

    if (divergent.length > 0) {
        const report = log[TypedInputNamesAreFatal ? 'bad' : 'warning'](
            `${divergent.length} input(s) are named differently from the type they take. One concept should be one word, as it is in English; pick the better word for each — a translator, not a script, since sometimes the type is the mistranslation.`,
        );
        for (const problem of divergent) report.warning(problem);
    }

    return revised;
}
