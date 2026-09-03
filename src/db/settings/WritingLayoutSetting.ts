import type { WritingLayout, WritingLayoutChoice } from '@locale/Scripts';
import Setting from '@db/settings/Setting';

/** The creator's writing-layout preference. Defaults to 'auto', which follows
 *  the active locale's layout; the other values force a specific layout. */
export const WritingLayoutSetting = new Setting<WritingLayoutChoice>(
    'writingLayout',
    false,
    'auto',
    (value) =>
        value === 'auto' ||
        value === 'horizontal-tb' ||
        value === 'vertical-rl' ||
        value === 'vertical-lr'
            ? value
            : undefined,
    (current, value) => current == value,
);

/** Per-project, per-source editor writing layouts, keyed by project ID then
 *  source index. */
export type SourceWritingLayouts = Record<
    string,
    Record<string, WritingLayout>
>;

/**
 * The layout a creator chose for one source's *code*, which is a different thing
 * from {@link WritingLayoutSetting} above: that one is how the creator wants to
 * read the interface, and this one is how they want to see a particular program.
 * They have to be separate, because the interface is in a few declared languages
 * while code can be written in any combination of them — so a Latin project must
 * stay horizontal even for someone reading a vertical interface (#1203).
 *
 * Only a layout the source is *eligible* for is honoured; see
 * `eligibleWritingLayouts`. Device-specific (never synced) and stored beside the
 * project rather than on it, mirroring {@link CaretsSetting} and
 * {@link FoldsSetting}: a view choice is ephemeral UI state, and putting it on
 * the project document would churn the reactive project on every toggle.
 */
function isWritingLayout(value: unknown): value is WritingLayout {
    return (
        value === 'horizontal-tb' ||
        value === 'vertical-rl' ||
        value === 'vertical-lr'
    );
}

/** A type predicate rather than a cast, so the narrowing the validator performs
 *  is one TypeScript can actually follow. */
function isSourceWritingLayouts(value: unknown): value is SourceWritingLayouts {
    return (
        value != null &&
        value.constructor.name === 'Object' &&
        Object.values(value).every(
            (sources) =>
                sources != null &&
                sources.constructor.name === 'Object' &&
                Object.values(sources).every(isWritingLayout),
        )
    );
}

export const SourceWritingSetting = new Setting<SourceWritingLayouts>(
    'sourceWriting',
    true,
    {},
    (value) => (isSourceWritingLayouts(value) ? value : undefined),
    (current, value) => current === value,
);
