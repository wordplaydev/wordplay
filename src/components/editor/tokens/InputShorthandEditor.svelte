<script lang="ts">
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { Projects } from '@db/projects/Projects';
    import type Bind from '@nodes/Bind';
    import type Evaluate from '@nodes/Evaluate';
    import type Token from '@nodes/Token';
    import type { Snippet } from 'svelte';

    interface Props {
        node: Token;
        evaluate: Evaluate;
        bind: Bind;
        project: Project;
        content: Snippet;
    }

    let { node, evaluate, bind, project, content }: Props = $props();

    let view: HTMLDivElement | undefined = $state();

    /** Unchecking removes the input, so the bind falls back to its own default. Routed through
     *  `withBindAs`, which knows a shorthand fills its bind by name and so must be removed
     *  rather than overwritten in place. */
    function uncheck(event: Event) {
        event.stopPropagation();
        if (view) setKeyboardFocus(view, 'Input shorthand after toggle');
        Projects.revise(project, [
            [
                evaluate,
                evaluate.withBindAs(
                    bind,
                    undefined,
                    project.getNodeContext(evaluate),
                ),
            ],
        ]);
    }
</script>

<!-- Checked by construction: the shorthand only exists when the input is on. The name itself is
     the label, so the box is decorative and the accessible name comes from the bind. -->
<div
    role="checkbox"
    class="token-editor"
    data-id={node.id}
    aria-checked="true"
    aria-label={$locales.getDescriptiveName(bind.names)}
    bind:this={view}
    onclick={uncheck}
    onkeydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? uncheck(event) : undefined}
    tabindex="0"
>
    {@render content()}
</div>

<style>
    div {
        display: inline-block;
        cursor: pointer;
        border-block-end: var(--wordplay-border-width) solid
            var(--wordplay-foreground);
    }

    /* Focus can't be a color swap alone: ring the token with a box-shadow,
       which is less busy than the global outline at this size. */
    div:focus {
        outline: none;
        color: var(--wordplay-focus-color);
        border-radius: var(--wordplay-editor-radius);
        box-shadow: 0 0 0 calc(var(--wordplay-focus-width) / 2)
            var(--wordplay-focus-color);
    }
</style>
