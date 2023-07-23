<script lang="ts">
    import { toShortcut, type Command } from '../editor/util/Commands';
    import Button from './Button.svelte';
    import { creator } from '../../db/Creator';
    import { IdleKind, getEditors, getEvaluator } from '../project/Contexts';
    import { tokenize } from '../../parser/Tokenizer';
    import TokenView from '../editor/TokenView.svelte';
    import { tick } from 'svelte';

    export let sourceID: string;
    export let command: Command;
    export let token: boolean = false;

    const evaluator = getEvaluator();
    const editors = getEditors();

    let view: HTMLButtonElement | undefined = undefined;
</script>

<Button
    tip={command.description($creator.getLocale()) +
        ` (${toShortcut(command)})`}
    bind:view
    action={async () => {
        const editor = $editors?.get(sourceID);
        if (editor) {
            const result = command.execute(
                editor.caret,
                '',
                $evaluator,
                $creator
            );
            if (typeof result === 'boolean') {
            } else if (result instanceof Promise)
                result.then((edit) => editor.edit(edit, IdleKind.Typing));
            else editor.edit(result, IdleKind.Typing);

            // Restore focus on button after update.
            await tick();
            view?.focus();
        } else return undefined;
    }}
    >{#if token}<TokenView
            node={tokenize(command.symbol).getTokens()[0]}
        />{:else}{command.symbol}{/if}</Button
>
