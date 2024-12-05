<script lang="ts">
    import { getCaret } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { Projects } from '@db/Database';
    import type Project from '@models/Project';
    import Sym from '@nodes/Sym';
    import Token from '@nodes/Token';
    import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';

    interface Props {
        node: Token;
        project: Project;
    }

    let { node, project }: Props = $props();

    const caret = getCaret();
    let view: HTMLDivElement | undefined = $state();

    let on = $derived(node.getText() === TRUE_SYMBOL);

    function toggle(event: Event) {
        event.stopPropagation();
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
    onclick={toggle}
    onkeydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? toggle(event) : undefined}
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
