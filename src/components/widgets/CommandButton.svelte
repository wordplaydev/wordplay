<script lang="ts">
    import { toShortcut, type Command } from '../editor/util/Commands';
    import Button from './Button.svelte';
    import { config } from '../../db/Database';
    import { IdleKind, getEditors, getEvaluator } from '../project/Contexts';
    import { tokenize } from '../../parser/Tokenizer';
    import TokenView from '../editor/TokenView.svelte';
    import { tick } from 'svelte';

    /** If source ID isn't provided, then the one with focus is used. */
    export let sourceID: string | undefined = undefined;
    export let command: Command;
    export let token: boolean = false;
    export let focusAfter: boolean = false;

    const evaluator = getEvaluator();
    const editors = getEditors();

    let view: HTMLButtonElement | undefined = undefined;

    $: editor = sourceID
        ? $editors?.get(sourceID)
        : Array.from($editors.values()).find((editor) => editor.focused);
</script>

<Button
    tip={command.description($config.getLocale()) + ` (${toShortcut(command)})`}
    bind:view
    uiid={command.uiid}
    active={command.active === undefined
        ? true
        : editor
        ? command.active(
              { caret: editor.caret, evaluator: $evaluator, database: $config },
              ''
          )
        : false}
    action={async () => {
        const hadFocus = view !== undefined && document.activeElement === view;

        const result = command.execute(
            {
                caret: editor?.caret,
                evaluator: $evaluator,
                database: $config,
                toggleMenu: editor?.toggleMenu,
            },
            ''
        );
        if (typeof result === 'boolean') {
        } else if (result instanceof Promise)
            result.then((edit) =>
                editor
                    ? editor.edit(edit, IdleKind.Typing, focusAfter)
                    : undefined
            );
        else if (result !== undefined)
            editor?.edit(result, IdleKind.Typing, focusAfter);

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
