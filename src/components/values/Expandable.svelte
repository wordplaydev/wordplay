<script lang="ts">
    import { type Snippet } from 'svelte';

    import { getContext } from 'svelte';

    interface Props {
        expanded: Snippet;
        collapsed: Snippet;
    }

    let { expanded, collapsed }: Props = $props();

    let all = $state(false);

    function toggle(event: Event) {
        all = !all;
        event.stopPropagation();
    }

    const interactive = getContext('interactive') === true;
</script>

<div
    role="button"
    class="expandable"
    tabindex={interactive ? 0 : null}
    onpointerdown={toggle}
    onkeydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? toggle(event) : undefined}
    >{#if all}{@render expanded()}{:else}{@render collapsed()}{/if}</div
>

<style>
    .expandable {
        display: inline;
        cursor: pointer;
    }
</style>
