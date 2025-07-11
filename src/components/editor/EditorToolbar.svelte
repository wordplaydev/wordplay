<script lang="ts">
    import type Locale from '../../locale/Locale';
    import { LOCALE_SYMBOL } from '../../parser/Symbols';
    import EditorLocaleChooser from '../project/EditorLocaleChooser.svelte';
    import Button from '../widgets/Button.svelte';
    import CommandButton from '../widgets/CommandButton.svelte';
    import type { Command } from './util/Commands';

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
    const importantModifyCommands = modifyCommands.filter(
        (cmd) => cmd.important,
    );
    const collapsedModifyCommands = modifyCommands.filter(
        (cmd) => !cmd.important,
    );
</script>

<!-- Navigate commands are always visible -->
{#each navigateCommands as command}
    <CommandButton {command} {sourceID} />
{/each}

<!-- If there are multiple locales, show the locale chooser -->
{#if localesUsed.length > 1}
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
    <!-- Important modify commands are always visible -->
    {#each importantModifyCommands as command}
        <CommandButton {command} {sourceID} />
    {/each}

    <!-- Show accordion button only if there are collapsed commands -->
    {#if collapsedModifyCommands.length > 0}
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
