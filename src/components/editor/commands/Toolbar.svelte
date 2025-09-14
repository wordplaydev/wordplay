<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { blocks, Settings } from '@db/Database';
    import type Locale from '../../../locale/Locale';
    import {
        BLOCK_EDITING_SYMBOL,
        LOCALE_SYMBOL,
        TEXT_EDITING_SYMBOL,
    } from '../../../parser/Symbols';
    import EditorLocaleChooser from '../../project/EditorLocaleChooser.svelte';
    import Button from '../../widgets/Button.svelte';
    import CommandButton from '../../widgets/CommandButton.svelte';
    import type { Command } from './Commands';

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

    let expanded = $state(false);

    function toggleExpanded() {
        expanded = !expanded;
    }

    // Separate important commands (to show always) from collapsed commands
    const importantModifyCommands = $derived(
        modifyCommands.filter((cmd) => cmd.important),
    );
    const collapsedModifyCommands = $derived(
        modifyCommands.filter((cmd) => !cmd.important),
    );

    const importantNavigateCommands = $derived(
        navigateCommands.filter((cmd) => cmd.important),
    );
    const collapsedNavigateCommands = $derived(
        navigateCommands.filter((cmd) => !cmd.important),
    );
</script>

<!-- Navigate commands are always visible -->
{#each importantNavigateCommands as command}
    <CommandButton {command} {sourceID} />
{/each}

<!-- If there are multiple locales, show the locale chooser -->
{#if localesUsed.length > 0}
    {LOCALE_SYMBOL}
    <EditorLocaleChooser
        locale={editorLocales[sourceID]}
        options={localesUsed}
        change={(locale) => {
            onChangeLocale(locale);
        }}
    />
{/if}

<!-- Make a Button for every modify command if editable -->
{#if editable}
    <Switch
        offLabel={TEXT_EDITING_SYMBOL}
        onLabel={BLOCK_EDITING_SYMBOL}
        offTip={(l) => l.ui.dialog.settings.mode.blocks.modes[0]}
        onTip={(l) => l.ui.dialog.settings.mode.blocks.modes[1]}
        on={$blocks}
        toggle={(on) => Settings.setBlocks(on)}
    />

    <!-- Important modify commands are always visible -->
    {#each importantModifyCommands as command}
        <CommandButton {command} {sourceID} />
    {/each}

    <!-- Show accordion button only if there are collapsed commands -->
    {#if collapsedModifyCommands.length > 0 || collapsedNavigateCommands.length > 0}
        <!-- Accordion control button -->
        <Button
            tip={(l) =>
                expanded
                    ? l.ui.source.button.collapseControls
                    : l.ui.source.button.expandControls}
            active={true}
            action={toggleExpanded}
            icon={expanded ? '⋮' : '⋯'}
        />

        <!-- Accordion content (expanded when clicked) -->
        {#if expanded}
            <div class="accordion-content">
                {#each collapsedNavigateCommands as command}
                    <CommandButton {command} {sourceID} />
                {/each}
                {#each collapsedModifyCommands as command}
                    <CommandButton {command} {sourceID} />
                {/each}
            </div>
        {/if}
    {/if}
{/if}

<style>
    .accordion-content {
        display: inline-flex;
        gap: var(--wordplay-spacing);
    }
</style>
