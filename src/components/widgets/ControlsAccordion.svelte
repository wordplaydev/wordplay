<script lang="ts">
    import type { Command } from '../editor/util/Commands';
    import Button from './Button.svelte';
    import CommandButton from './CommandButton.svelte';

    interface Props {
        sourceID: string;
        commands: Command[];
    }

    let { sourceID, commands }: Props = $props();

    let expanded = $state(false);

    // Commands to always show (those marked as important)
    const importantCommands = commands.filter((cmd) => cmd.important === true);

    // Commands to show in the accordion (those not marked as important)
    const accordionCommands = commands.filter((cmd) => cmd.important !== true);

    function toggleExpanded() {
        expanded = !expanded;
    }
</script>

<!-- Always visible important commands -->
{#each importantCommands as command}
    <CommandButton {command} {sourceID} />
{/each}

<!-- Only show accordion button if there are non-important commands -->
{#if accordionCommands.length > 0}
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
{/if}

<style>
    .accordion-content {
        display: inline-flex;
        gap: var(--wordplay-spacing);
    }
</style>
