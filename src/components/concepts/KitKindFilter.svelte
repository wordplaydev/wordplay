<!-- Filter the kit registry by what a kit shares (#8).

     Not a `Mode`, though that is the house widget: `Mode` takes a positional tuple of
     localized labels, and this set is neither positional nor localized in the locale file
     — it is concept ids, named through the same walk a `@Color` link uses, so the filter
     and the link never disagree about what a colour is called. -->
<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { getNextOption } from '@components/widgets/optionNavigation';
    import { locales } from '@db/Database';
    import { localizedConceptName } from '@locale/getConceptName';

    interface Props {
        /** The kinds on offer, already ordered, with how many kits carry each. */
        kinds: { kind: string; count: number }[];
        /** The kind being browsed, or undefined for all of them. */
        chosen: string | undefined;
        choose: (kind: string | undefined) => void;
    }

    let { kinds, chosen, choose }: Props = $props();

    /** Index 0 is "all"; the rest are the kinds, in the order given. */
    const options = $derived([undefined, ...kinds.map(({ kind }) => kind)]);
    const choice = $derived(Math.max(0, options.indexOf(chosen)));

    let buttons: (HTMLButtonElement | undefined)[] = $state([]);
    let rtl = $derived($locales.getDirection() === 'rtl');

    /** A radiogroup is one tab stop with arrow keys inside it, which is the whole reason
     *  the role is worth declaring. `getNextOption` is `Mode`'s own, so the two groups
     *  move the same way. */
    function handleKey(event: KeyboardEvent, index: number) {
        const next = getNextOption(
            options.map((_, i) => i),
            index,
            event.key,
            rtl,
        );
        if (next === undefined) return;
        choose(options[next]);
        buttons[next]?.focus();
        event.preventDefault();
        event.stopPropagation();
    }
</script>

<div
    class="kinds"
    role="radiogroup"
    aria-label={$locales.getPrimaryPlainText((l) => l.ui.docs.kits.kinds.label)}
>
    <button
        type="button"
        role="radio"
        aria-checked={chosen === undefined}
        class:selected={chosen === undefined}
        tabindex={choice === 0 ? 0 : -1}
        bind:this={buttons[0]}
        onkeydown={(event) => handleKey(event, 0)}
        onclick={() => choose(undefined)}
        ><LocalizedText path={(l) => l.ui.docs.kits.kinds.all} /></button
    >
    {#each kinds as { kind, count }, index (kind)}
        <button
            type="button"
            role="radio"
            aria-checked={chosen === kind}
            class:selected={chosen === kind}
            tabindex={choice === index + 1 ? 0 : -1}
            bind:this={buttons[index + 1]}
            onkeydown={(event) => handleKey(event, index + 1)}
            onclick={() => choose(chosen === kind ? undefined : kind)}
            >{localizedConceptName($locales.getLocales(), kind)}<span
                class="count">{count}</span
            ></button
        >
    {/each}
</div>

<style>
    .kinds {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        margin-block-end: var(--wordplay-spacing);
    }

    button {
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing-half) var(--wordplay-spacing);
        cursor: pointer;
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: var(--wordplay-spacing-half);
    }

    button:focus {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
    }

    /* `--wordplay-background` on this gold is white in light mode, which measures
       3.01:1 — under AA, and axe reports it. `.highlight-surface` in app.html is the
       app's answer for any surface painted `--wordplay-highlight-color`: literal black,
       which passes in both schemes (6.96:1 light, 5.87:1 dark). Kept as a rule here
       rather than a class on the button so the count inside it inherits too. */
    .selected {
        background: var(--wordplay-highlight-color);
        color: var(--black-light);
    }

    /* How many kits carry this kind, in what has been loaded — see the comment at the
       call site about why that is a count of what's in hand rather than of the registry. */
    .count {
        font-size: var(--wordplay-small-font-size);
        opacity: 0.7;
    }
</style>
