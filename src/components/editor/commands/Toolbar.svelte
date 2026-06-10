<script lang="ts">
    import type { Command } from '@components/editor/commands/Commands';
    import EditorLocaleChooser from '@components/project/EditorLocaleChooser.svelte';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import { blocks, Settings, wrap } from '@db/Database';
    import type Locale from '@locale/Locale';
    import {
        BLOCK_EDITING_SYMBOL,
        LOCALE_SYMBOL,
        TEXT_EDITING_SYMBOL,
    } from '@parser/Symbols';

    interface Props {
        sourceID: string;
        navigateCommands: Command[];
        modifyCommands: Command[];
        editable: boolean;
        localesUsed: Locale[];
        editorLocales: Record<string, Locale | null>;
        onChangeLocale: (locale: Locale | null) => void;
    }

    let {
        sourceID,
        navigateCommands,
        modifyCommands,
        editable,
        localesUsed,
        editorLocales,
        onChangeLocale,
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

    // Item layout (each index = one overflow unit):
    //   0           : mode toggle
    //   1           : locale chooser (only when hasLocale)
    //   1+|2+ ..    : individual command buttons
    const localeOffset = $derived(hasLocale ? 1 : 0);
    // The soft-wrap toggle is a final item, shown only in text mode (blocks mode
    // manages its own layout and is out of scope for wrapping).
    const showWrap = $derived(!$blocks);
    const itemCount = $derived(
        1 + localeOffset + commands.length + (showWrap ? 1 : 0),
    );
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
    {:else if hasLocale && i === 1}
        <span class="locale" data-uiid="editorToolbar">
            {LOCALE_SYMBOL}
            <EditorLocaleChooser
                locale={editorLocales[sourceID]}
                options={localesUsed}
                change={(locale) => onChangeLocale(locale)}
            />
        </span>
    {:else if showWrap && i === itemCount - 1}
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
    {:else}
        <CommandButton command={commands[i - 1 - localeOffset]} {sourceID} />
    {/if}
{/snippet}

<OverflowToolbar items={{ count: itemCount, render: renderItem }} />

<style>
    .locale {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
