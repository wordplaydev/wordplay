<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Commands, {
        Category,
        type Command,
    } from '@components/editor/commands/Commands';
    import { MarkupOnlyCommands } from '@components/editor/markup/MarkupCommands';
    import CommandDescription from '@components/project/CommandDescription.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Button from '@components/widgets/Button.svelte';
    import { DB, keybindings, locales } from '@db/Database';
    import { getAnnouncer } from '@components/project/Contexts';

    /**
     * The sections, in the order they're shown. `Category.Fallback` is
     * deliberately absent: its one member is the catch-all that inserts whatever
     * character was typed, which is not a shortcut and read as one.
     *
     * The markup editor's own commands are listed too. They were missing
     * entirely, so every chord for writing a doc or a chat message was
     * undiscoverable — and this is the app's only shortcut reference.
     */
    const Sections: {
        header: LocaleTextAccessor;
        commands: Command[];
    }[] = [
        {
            header: (l) => l.ui.dialog.help.subheader.moveCursor,
            commands: Commands.filter((c) => c.category === Category.Cursor),
        },
        {
            header: (l) => l.ui.dialog.help.subheader.editCode,
            commands: Commands.filter((c) => c.category === Category.Modify),
        },
        {
            header: (l) => l.ui.dialog.help.subheader.insertCode,
            commands: Commands.filter((c) => c.category === Category.Insert),
        },
        {
            header: (l) => l.ui.dialog.help.subheader.debug,
            commands: Commands.filter((c) => c.category === Category.Evaluate),
        },
        {
            header: (l) => l.ui.dialog.help.subheader.format,
            commands: MarkupOnlyCommands,
        },
        // Including the help command itself, which used to be the one shortcut
        // missing from the list of shortcuts.
        {
            header: (l) => l.ui.dialog.help.subheader.help,
            commands: Commands.filter((c) => c.category === Category.Help),
        },
    ];

    /** Every command the dialog lists, so a row can tell whether a chord a
     *  creator proposes is already taken by another one. */
    const Everything = Sections.flatMap((section) => section.commands);

    const announce = getAnnouncer();

    /** Offered only when there is something to undo, so the control never
     *  promises an action that would do nothing. */
    let anyChanged = $derived(Object.keys($keybindings).length > 0);

    function resetAll() {
        DB.Settings.resetKeybindings();
        if (announce && $announce)
            $announce(
                'keybinding',
                $locales.getLanguages()[0],
                $locales.getPrimaryPlainText((l) => l.ui.dialog.help.resetAll),
            );
    }
</script>

{#if anyChanged}
    <p class="reset-all">
        <Button tip={(l) => l.ui.dialog.help.resetAll} action={resetAll}
            ><LocalizedText path={(l) => l.ui.dialog.help.resetAll} /></Button
        >
    </p>
{/if}

<table>
    <thead>
        <tr>
            <th scope="col"
                ><LocalizedText
                    path={(l) => l.ui.dialog.help.column.symbol}
                /></th
            >
            <th scope="col"
                ><LocalizedText
                    path={(l) => l.ui.dialog.help.column.shortcut}
                /></th
            >
            <th scope="col"
                ><LocalizedText
                    path={(l) => l.ui.dialog.help.column.action}
                /></th
            >
            <th scope="col"
                ><LocalizedText
                    path={(l) => l.ui.dialog.help.column.change}
                /></th
            >
        </tr>
    </thead>
    {#each Sections as section}
        <tbody>
            <tr>
                <th colspan="4" scope="colgroup"
                    ><Subheader text={section.header} /></th
                >
            </tr>
            {#each section.commands as command}
                <CommandDescription {command} all={Everything} />
            {/each}
        </tbody>
    {/each}
</table>

<style>
    table {
        border-spacing: 0;
        border: none;
        width: 100%;
    }

    th {
        padding: var(--wordplay-spacing);
        text-align: start;
    }

    .reset-all {
        margin-block-end: var(--wordplay-spacing);
    }

    /* The section headings sit inside the table, so they need the spacing the
       surrounding rows don't give them. */
    th :global(.subheader) {
        margin-block-start: var(--wordplay-spacing);
    }
</style>
