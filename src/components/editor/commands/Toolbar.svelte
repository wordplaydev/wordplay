<script lang="ts">
    import type { Command } from '@components/editor/commands/Commands';
    import EditorLocaleChooser from '@components/project/EditorLocaleChooser.svelte';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import { blocks, Settings, sourceWriting, wrap } from '@db/Database';
    import eligibleWritingLayouts from '@edit/eligibleWritingLayouts';
    import type Project from '@db/projects/Project';
    import type Source from '@nodes/Source';
    import type { WritingLayout } from '@locale/Scripts';
    import type Locale from '@locale/Locale';
    import {
        BLOCK_EDITING_SYMBOL,
        CANCEL_SYMBOL,
        LOCALE_SYMBOL,
        TEXT_EDITING_SYMBOL,
    } from '@parser/Symbols';

    interface Props {
        sourceID: string;
        /** The project and source this toolbar acts on, so the writing-layout
         *  control can tell what this code's glyphs allow. */
        project: Project;
        source: Source;
        navigateCommands: Command[];
        modifyCommands: Command[];
        editable: boolean;
        localesUsed: Locale[];
        editorLocales: Record<string, Locale | null>;
        onChangeLocale: (locale: Locale | null) => void;
        /** Whether this source may be shown in a second view here. False in the
         *  one- and two-tile arrangements, which choose what to show by
         *  recency, so a second view would displace the first. */
        canSplit: boolean;
        /** Whether this source already has a second view, which decides whether
         *  the control adds one or closes one. */
        hasView: boolean;
        onToggleView: () => void;
    }

    let {
        sourceID,
        project,
        source,
        navigateCommands,
        modifyCommands,
        editable,
        localesUsed,
        editorLocales,
        onChangeLocale,
        canSplit,
        hasView,
        onToggleView,
    }: Props = $props();

    // Flat list of important commands shown in order: navigate, then modify
    // (modify only when editable). Each command is its own overflow unit so
    // they drop into the hamburger popup individually as the row narrows.
    // Non-important commands aren't shown in the toolbar at all — they're
    // still reachable via keyboard shortcuts and autocomplete.
    const commands = $derived(
        editable
            ? [
                  ...navigateCommands.filter((c) => c.important),
                  ...modifyCommands.filter((c) => c.important),
              ]
            : navigateCommands.filter((c) => c.important),
    );

    const hasLocale = $derived(localesUsed.length > 0);

    /** The chooser and the split control share one overflow unit, so the control
     *  that makes a second view can never drift away from the chooser that gives
     *  each view its language. The slot exists if either belongs in it. */
    const hasLocaleSlot = $derived(hasLocale || canSplit);

    /** The layouts this source's own glyphs allow. Offered rather than imposed:
     *  the code decides what is possible and the creator decides what to see. */
    const layouts = $derived(eligibleWritingLayouts(source));

    /** The vertical layout on offer, when there is one. Exactly one can be —
     *  a letter belongs to one vertical tradition, so either every letter agrees
     *  or none is offered. */
    const verticalLayout = $derived(layouts[1]);

    const sourceIndex = $derived(project.getIndexOfSource(source));

    /** The chosen layout, ignored when this source is no longer eligible for it
     *  — typing a Latin name into a Japanese program takes vertical away. */
    const layout: WritingLayout = $derived.by(() => {
        const chosen = $sourceWriting[project.getID()]?.[sourceIndex];
        return chosen !== undefined && layouts.includes(chosen)
            ? chosen
            : 'horizontal-tb';
    });

    /** Indices into `mode.writing`'s four options, which this reuses rather than
     *  adding strings of its own. */
    const WritingOptions: WritingLayout[] = [
        'horizontal-tb',
        'vertical-rl',
        'vertical-lr',
    ];

    // Item layout (each index = one overflow unit):
    //   0           : mode toggle
    //   1           : locale chooser + split control (only when hasLocaleSlot)
    //   1+|2+ ..    : individual command buttons
    //   trailing    : the display toggles that apply (see `trailing`)
    const localeOffset = $derived(hasLocaleSlot ? 1 : 0);
    // The soft-wrap toggle is a final item, shown only in text mode (blocks mode
    // manages its own layout and is out of scope for wrapping).
    const showWrap = $derived(!$blocks);
    /** Trailing display toggles, listed so adding one doesn't mean redoing the
     *  index arithmetic for the others. */
    const trailing = $derived([
        ...(showWrap ? ['wrap'] : []),
        ...(verticalLayout !== undefined ? ['writing'] : []),
    ]);
    const commandsStart = $derived(1 + localeOffset);
    const trailingStart = $derived(commandsStart + commands.length);
    const itemCount = $derived(trailingStart + trailing.length);
</script>

{#snippet renderItem(i: number)}
    {#if i === 0}
        <span data-uiid="textBlocksToggle">
            <Mode
                icons={[TEXT_EDITING_SYMBOL, BLOCK_EDITING_SYMBOL]}
                modes={(l) => l.ui.dialog.settings.mode.blocks}
                choice={$blocks ? 1 : 0}
                select={(mode) => Settings.setBlocks(mode === 1)}
                labeled={false}
                modeLabels={false}
            />
        </span>
    {:else if hasLocaleSlot && i === 1}
        <span class="locale" data-uiid="editorToolbar">
            {#if hasLocale}
                {LOCALE_SYMBOL}
                <EditorLocaleChooser
                    id="code-locale-{sourceID}"
                    locale={editorLocales[sourceID]}
                    options={localesUsed}
                    change={(locale) => onChangeLocale(locale)}
                />
            {/if}
            <!-- Adding and closing a view are the same control in the same
                 place, beside the chooser that gives each view its language. -->
            {#if canSplit}
                <Button
                    uiid={hasView ? 'closeSourceView' : 'addSourceView'}
                    background={false}
                    tip={(l) =>
                        hasView
                            ? l.ui.source.button.closeView
                            : l.ui.source.button.addView}
                    action={onToggleView}
                    icon={hasView ? CANCEL_SYMBOL : '+'}
                ></Button>
            {/if}
        </span>
    {:else if i >= trailingStart && trailing[i - trailingStart] === 'wrap'}
        <span data-uiid="wrapToggle">
            <Mode
                icons={['↔', '↩']}
                modes={(l) => l.ui.dialog.settings.mode.wrap}
                choice={$wrap ? 1 : 0}
                select={(mode) => Settings.setWrap(mode === 1)}
                labeled={false}
                modeLabels={false}
            />
        </span>
    {:else if i >= trailingStart && trailing[i - trailingStart] === 'writing'}
        <!-- Shown only when this source's glyphs allow something other than
             horizontal, and offering only the direction they are actually set
             in. Reuses the settings dialog's writing strings rather than adding
             its own, trimming the vertical direction this code can't use and
             `automatic` — eligibility already answers what that would ask. -->
        <span data-uiid="writingToggle">
            <Mode
                icons={['↔↓', '↕←', '↕→', '🌐']}
                modes={(l) => l.ui.dialog.settings.mode.writing}
                choice={WritingOptions.indexOf(layout)}
                select={(mode) =>
                    Settings.setSourceWriting(
                        project.getID(),
                        sourceIndex,
                        WritingOptions[mode] ?? 'horizontal-tb',
                    )}
                omit={verticalLayout === 'vertical-rl' ? [2, 3] : [1, 3]}
                labeled={false}
                modeLabels={false}
            />
        </span>
    {:else}
        <CommandButton command={commands[i - commandsStart]} {sourceID} />
    {/if}
{/snippet}

<!-- Name the hamburger so the source tour's "expand" step can point at it; it
     is what became of the old expand toggle. -->
<OverflowToolbar
    items={{ count: itemCount, render: renderItem }}
    uiid="editorExpand"
/>

<style>
    .locale {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
