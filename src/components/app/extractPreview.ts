/**
 * Pure extractor: given an Evaluator and the project's top-level value,
 * return a {@link SerializedPreview}-shaped payload (sans `mode`) that
 * describes how the project should render as a small preview tile.
 *
 * Used by:
 *  - ProjectView's auto-update effect, with the live evaluator's latest value
 *  - The on-demand preview queue, with a fresh ephemeral evaluator
 *
 * This is the same logic that used to live inline in ProjectPreview's
 * `$derived.by` (see [src/components/app/ProjectPreview.svelte] history),
 * lifted so neither preview component constructs an evaluator of its own.
 */

import type Locales from '@locale/Locales';
import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
import { EXCEPTION_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import UnicodeString from '@unicode/UnicodeString';
import { getFaceCSS } from '@output/outputToCSS';
import { toStage } from '@output/Stage';
import type Value from '@values/Value';
import ExceptionValue from '@values/ExceptionValue';
import MarkupValue from '@values/MarkupValue';
import StructureValue from '@values/StructureValue';

export type ExtractedPreview = {
    text: string;
    foreground: string | null;
    background: string | null;
    face: string | null;
    characterName: string | null;
};

function findCharacterName(value: Value): string | null {
    if (value instanceof MarkupValue) {
        for (const node of value.markup.nodes()) {
            if (node instanceof ConceptLink) {
                const parsed = ConceptLink.parse(node.getName());
                if (parsed instanceof CharacterName)
                    return `${parsed.username}/${parsed.name}`;
            }
        }
    }
    if (value instanceof StructureValue) {
        for (const [, fieldValue] of value.context.getBindingsByNames()) {
            const result = findCharacterName(fieldValue);
            if (result) return result;
        }
    }
    return null;
}

export function extractPreview(
    evaluator: Evaluator,
    value: Value | undefined,
    locales: Locales,
): ExtractedPreview {
    // A character link in the value short-circuits — the renderer draws the
    // referenced Character instead of a glyph.
    const character = value ? findCharacterName(value) : null;
    if (character)
        return {
            text: '',
            foreground: null,
            background: null,
            face: null,
            characterName: character,
        };

    const stage = value ? toStage(evaluator, value) : undefined;

    return {
        face: stage ? getFaceCSS(stage.face) : null,
        foreground: stage
            ? (stage.pose.color?.toCSS() ?? null)
            : 'var(--wordplay-evaluation-color)',
        background: stage
            ? stage.back.toCSS()
            : value instanceof ExceptionValue || value === undefined
              ? 'var(--wordplay-error)'
              : null,
        text: stage
            ? new UnicodeString(stage.getRepresentativeText(locales))
                  .substring(0, 1)
                  .toString()
            : value
              ? value.getRepresentativeText(locales)
              : EXCEPTION_SYMBOL,
        characterName: null,
    };
}
