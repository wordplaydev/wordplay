<script lang="ts">
    import { getCaret } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { Projects } from '@db/Database';
    import type Project from '@models/Project';
    import Sym from '@nodes/Sym';
    import Token from '@nodes/Token';
    import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';

    export let node: Token;
    export let project: Project;

    const caret = getCaret();
    let view: HTMLDivElement | undefined;

    $: on = node.getText() === TRUE_SYMBOL;

    function toggle() {
        if (view) setKeyboardFocus(view, 'Boolean toggle after toggle');

        const newToken = new Token(
            on ? FALSE_SYMBOL : TRUE_SYMBOL,
            Sym.Boolean,
        );
        Projects.revise(project, [[node, newToken]]);
        if (caret && $caret)
            caret.set($caret.withPosition(newToken).withAddition(newToken));
    }
</script>

<div
    role="checkbox"
    class="token-editor"
    data-id={node.id}
    aria-checked={on}
    bind:this={view}
    on:click|stopPropagation={toggle}
    on:keydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? toggle() : undefined}
    tabindex="0"
>
    {on ? TRUE_SYMBOL : FALSE_SYMBOL}
</div>

<style>
    div {
        display: inline-block;
        cursor: pointer;
        user-select: none;
    }

    div:focus {
        outline: none;
        color: var(--wordplay-focus-color);
    }
</style>
