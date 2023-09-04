<script lang="ts">
    import { toShortcut, type Command } from '../editor/util/Commands';
    import Button from './Button.svelte';
    import { locale } from '../../db/Database';
    import {
        IdleKind,
        getEditors,
        getProjectCommandContext,
    } from '../project/Contexts';
    import { tokenize } from '../../parser/Tokenizer';
    import TokenView from '../editor/TokenView.svelte';
    import { tick } from 'svelte';

    /** If source ID isn't provided, then the one with focus is used. */
    export let sourceID: string | undefined = undefined;
    export let command: Command;
    export let token = false;
    export let focusAfter = false;
    export let padding = true;

    const editors = getEditors();

    let view: HTMLButtonElement | undefined = undefined;

    $: editor = sourceID
        ? $editors?.get(sourceID)
        : Array.from($editors.values()).find((editor) => editor.focused);

    const context = getProjectCommandContext();

    $: active =
        command.active === undefined
            ? true
            : $context
            ? command.active($context, '')
            : false;
</script>

<Button
    tip={command.description($locale) + ` (${toShortcut(command)})`}
    bind:view
    uiid={command.uiid}
    {padding}
    {active}
    action={async () => {
        const hadFocus = view !== undefined && document.activeElement === view;

        if (context === undefined) return;

        const result = command.execute($context, '');
        if (result instanceof Promise)
            result.then((edit) =>
                editor
                    ? editor.edit(edit, IdleKind.Typed, focusAfter)
                    : undefined
            );
        else if (typeof result !== 'boolean' && result !== undefined)
            editor?.edit(result, IdleKind.Typed, focusAfter);

        // If we didn't ask the editor to focus, restore focus on button after update.
        if (!focusAfter && hadFocus) {
            await tick();
            view?.focus();
        }
    }}
    >{#if token}<TokenView
            node={tokenize(command.symbol).getTokens()[0]}
        />{:else}{command.symbol}{/if}</Button
>
