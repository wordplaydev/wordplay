<script lang="ts">
    import { getTip } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import { getTermDefinitionString } from '@locale/Glossary';
    import type TermRef from '@locale/TermRef';

    interface Props {
        term: TermRef;
    }

    let { term }: Props = $props();

    // The shared tooltip surface (set in the root layout). Show the term's
    // definition as rich, multilingual Markup on hover/focus — its own
    // @term/@Concept cross-references render and resolve inside the tip.
    const hint = getTip();
    let view: HTMLElement | undefined = $state(undefined);

    function showTip() {
        if (view)
            hint.showMarkup(
                $locales.getMultilingualMarkup((l) =>
                    getTermDefinitionString(l, term.id),
                ),
                view,
            );
    }
    function hideTip() {
        hint.hide();
    }
</script>

<button
    type="button"
    class="term"
    bind:this={view}
    onpointerenter={showTip}
    onpointerleave={hideTip}
    onclick={showTip}
    onfocus={showTip}
    onblur={hideTip}>{term.word}</button
>

<style>
    /* Inline glossary affordance: a subtle dotted underline + help cursor,
       distinct from concept links (solid highlight color). Renders as plain
       inline text — no button chrome. */
    .term {
        display: inline;
        font: inherit;
        color: inherit;
        text-align: start;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        text-decoration: underline dotted;
        text-decoration-thickness: 1px;
        text-underline-offset: 2px;
        cursor: help;
    }

    .term:focus,
    .term:hover {
        outline: none;
        text-decoration-color: var(--wordplay-focus-color);
    }
</style>
