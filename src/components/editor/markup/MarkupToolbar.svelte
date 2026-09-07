<script lang="ts">
    import {
        caretIsInExample,
        ExampleOnlyCommands,
        MarkupModeCommand,
        MarkupToolbarGroups,
    } from '@components/editor/markup/MarkupCommands';
    import { getEditors } from '@components/project/Contexts';
    import Separator from '@components/project/Separator.svelte';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { debounced } from '@util/debounce.svelte';

    interface Props {
        /** The id of the editor these commands act on. */
        sourceID: string;
        /** Whether the editor is showing prose rather than the formatting marks,
         *  so the mode control can show which mode it is in — a plain button
         *  shows neither, and this one has two states to tell apart. */
        prose: boolean;
        /** Switch modes. The caller owns the setting, exactly as the mode command
         *  does, so the toolbar and the shortcut cannot disagree. */
        toggleMode?: (() => void) | undefined;
    }

    let { sourceID, prose, toggleMode = undefined }: Props = $props();

    let editors = getEditors();

    /**
     * Whether the caret has settled inside a `\…\` example, which decides whether
     * the annotation buttons are offered at all.
     *
     * Debounced for the reason `Command.where` documents: the caret publishes on
     * every keystroke, and a toolbar whose item count changes that often makes
     * `OverflowToolbar` re-measure every item and can reshuffle the hamburger out
     * from under the pointer.
     */
    const settled = debounced(
        () => $editors?.get(sourceID)?.displayedCaret,
        400,
    );
    let annotating = $derived(caretIsInExample(settled.current));

    /**
     * The groups, flattened, with the index each group starts at so a rule can be
     * drawn before it. An annotation group empties outside an example and is then
     * skipped whole, rather than leaving a rule with nothing after it.
     */
    let shown = $derived.by(() => {
        const items: {
            command: (typeof MarkupToolbarGroups)[0][0];
            first: boolean;
        }[] = [];
        for (const group of MarkupToolbarGroups) {
            const visible = group.filter(
                (command) =>
                    annotating || !ExampleOnlyCommands.includes(command),
            );
            for (const [index, command] of visible.entries())
                items.push({ command, first: index === 0 && items.length > 0 });
        }
        return items;
    });
</script>

<!-- The buttons are the same Commands the keyboard dispatches, so a shortcut and
     a button can never disagree about what they do or what they announce. Each
     item is one box so `OverflowToolbar` measures it exactly; a group's leading
     rule rides inside its first item, and hides in the overflow panel, where a
     stretched vertical rule in a column of buttons would read as a stray mark. -->
{#snippet renderItem(index: number)}
    <span class="item"
        >{#if shown[index].first}<Separator
            />{/if}{#if shown[index].command === MarkupModeCommand}<Toggle
                tips={(l) => ({
                    // The tip names what pressing it will DO, so it reads as the
                    // action from whichever mode you are in.
                    on: l.ui.markup.mode.source,
                    off: l.ui.markup.mode.prose,
                })}
                on={prose}
                command={MarkupModeCommand}
                active={toggleMode !== undefined}
                toggle={() => toggleMode?.()}
                >{shown[index].command.symbol}</Toggle
            >{:else}<CommandButton
                command={shown[index].command}
                {sourceID}
            />{/if}</span
    >
{/snippet}

<OverflowToolbar items={{ count: shown.length, render: renderItem }} />

<style>
    .item {
        display: inline-flex;
        align-items: stretch;
    }

    /* A group rule is a horizontal-row affordance; the overflow panel stacks its
       buttons in a column, where the same rule would sit above one of them. */
    :global(.overflow-panel) .item :global(.separator) {
        display: none;
    }
</style>
