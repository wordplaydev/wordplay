import type { HowToID } from '@concepts/HowTo';
import type InputTexts from '@locale/InputTexts';
import type NodeTexts from '@locale/NodeTexts';
import type OutputTexts from '@locale/OutputTexts';
import type BasisTexts from '@locale/BasisTexts';
import type LanguageCode from '@locale/LanguageCode';
import type { RegionCode } from '@locale/Regions';
import type { Emotion } from '../lore/Emotion';

export type Tutorial = {
    /** This is here so that when we generate a JSON schema for a tutorial, the VS Code schema property is allowed **/
    $schema: string;
    language: LanguageCode;
    regions: RegionCode[];
    /** The acts of the tutorial. Variable length so that different tutorial modes (e.g. the
     * "quick" tour) can have their own structure; see TutorialMode. */
    acts: Act[];
};

export type Act<Scenes extends Scene[] = Scene[]> = {
    title: string;
    performance: Performance;
    scenes: Scenes;
};

export type Scene = {
    title: string;
    subtitle: string | null;
    concept?: CharacterName;
    performance: Performance;
    lines: Line[];
};

export type Line = Dialog | Performance | null;

/** How a performance's program is displayed: rendered fit-to-content, rendered at a fixed size, or
 * shown in an editable editor. */
export type PerformanceMode = 'fit' | 'fix' | 'edit';

/** A program: a single line, or an array of lines for a multi-line program (kept as an array so the
 * JSON has no embedded newlines). */
export type Code = string | string[];

/** Optional flags shared by all performances (independent of each other):
 * - `conflicts: true` marks a program expected to have conflicts, so the verifier won't fail it.
 * - `sidebar: true` shows the editor's annotation panel expanded initially.
 * They're separate so a step can suppress conflict warnings without forcing the panel open, or open
 * the panel for a clean program. Add future flags here. */
export type PerformanceOptions = { conflicts?: boolean; sidebar?: boolean };

/**
 * What the tutorial's project tile shows for a step: a mode-as-key object whose value is the program
 * — literal Wordplay code, or a template reference (`#DarkVoid`, `#Symbol 📄`) resolving to a named
 * program in Performances.ts. Mapped over {@link PerformanceMode} so the modes aren't repeated; each
 * member has exactly one mode key plus the shared {@link PerformanceOptions}.
 *
 *   { "fit": "Phrase('🌙')" }
 *   { "edit": "1 + 'hi'", "conflicts": true, "sidebar": true }
 *   { "edit": ["score: 10", "score + 5"], "conflicts": true }
 *   { "fix": "#DarkVoid", "sidebar": true }
 */
export type Performance = {
    [Mode in PerformanceMode]: { [Key in Mode]: Code } & PerformanceOptions;
}[PerformanceMode];

/** A line is a performance if it's a non-null object (Dialog is an array, pauses are null). */
export function isPerformance(line: Line): line is Performance {
    return line !== null && !Array.isArray(line);
}

/** A reference to a named program in Performances.ts, parsed from a `#name args` value. */
export type TemplateReference = { name: string; inputs: string[] };

/** A performance parsed into structured, type-safe parts for rendering. */
export type ParsedPerformance = {
    mode: PerformanceMode;
    /** The literal program code, or a reference to a named template — never both or neither. */
    code: string | TemplateReference;
    /** Whether conflicts are expected (the verifier won't fail the program). */
    conflicts: boolean;
    /** Whether the editor's annotation panel should start expanded. */
    sidebar: boolean;
};

/** Reserved prefix marking a value as a template reference rather than literal code. */
const TemplatePrefix = '#';

/** Parse a performance value (literal code lines or a `#template` reference) into a Code or ref. */
function parseCode(value: Code): string | TemplateReference {
    // An array is always literal code, one element per line.
    if (Array.isArray(value)) return value.join('\n');
    const match = value.match(/^#(\w+)(?:\s+([\s\S]+))?$/);
    if (value.startsWith(TemplatePrefix) && match !== null)
        return {
            name: match[1],
            inputs: match[2] === undefined ? [] : match[2].split(/\s+/),
        };
    return value;
}

/** Parse a Performance into structured, type-safe parts. */
export function parsePerformance(performance: Performance): ParsedPerformance {
    const conflicts = performance.conflicts ?? false;
    const sidebar = performance.sidebar ?? false;
    if ('fit' in performance)
        return {
            mode: 'fit',
            code: parseCode(performance.fit),
            conflicts,
            sidebar,
        };
    if ('fix' in performance)
        return {
            mode: 'fix',
            code: parseCode(performance.fix),
            conflicts,
            sidebar,
        };
    return {
        mode: 'edit',
        code: parseCode(performance.edit),
        conflicts,
        sidebar,
    };
}

export type CharacterName =
    | keyof NodeTexts
    | keyof InputTexts
    | keyof OutputTexts
    | keyof BasisTexts
    | HowToID
    | '⊤'
    | '⊥';

export type Dialog = [CharacterName, `${Emotion}`, ...string[]];

export { type Tutorial as default };
