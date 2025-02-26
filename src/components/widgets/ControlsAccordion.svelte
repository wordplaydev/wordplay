<script lang="ts">
    import {
        COPY_SYMBOL,
        CUT_SYMBOL,
        PASTE_SYMBOL,
    } from '../../parser/Symbols';
    import type { Command } from '../editor/util/Commands';
    import Button from './Button.svelte';
    import CommandButton from './CommandButton.svelte';

    interface Props {
        sourceID: string;
        commands: Command[];
    }

    let { sourceID, commands }: Props = $props();

    let expanded = $state(false);

    // Commands to always show (undo and redo are kept visible per the design requirements)
    const alwaysVisibleCommands = commands.filter(
        (cmd) =>
            cmd.symbol === '↩' || // Undo
            cmd.symbol === '↪', // Redo
    );

    // Commands to show in the accordion (copy, cut, paste per approved design)
    const accordionCommands = commands.filter(
        (cmd) =>
            cmd.symbol === COPY_SYMBOL ||
            cmd.symbol === CUT_SYMBOL ||
            cmd.symbol === PASTE_SYMBOL,
    );

    function toggleExpanded() {
        expanded = !expanded;
    }
</script>

<!-- Always visible commands -->
{#each alwaysVisibleCommands as command}
    <CommandButton {command} {sourceID} />
{/each}

<!-- Accordion control button -->
<Button
    tip={(l) =>
        expanded
            ? l.ui.source.button.collapseControls
            : l.ui.source.button.expandControls}
    active={true}
    action={toggleExpanded}
    icon="⋯"
/>

<!-- Accordion content (expanded when clicked) -->
{#if expanded}
    <div class="accordion-content">
        {#each accordionCommands as command}
            <CommandButton {command} {sourceID} />
        {/each}
    </div>
{/if}

<style>
    .accordion-content {
        display: inline-flex;
        gap: var(--wordplay-spacing);
    }
</style>
