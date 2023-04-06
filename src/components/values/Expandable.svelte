<script lang="ts">
    import { getContext } from 'svelte';

    let expanded = false;

    function toggle(event: Event) {
        expanded = !expanded;
        event.stopPropagation();
    }

    const interactive = getContext('interactive') === true;
</script>

<div
    role="button"
    class="expandable"
    tabindex={interactive ? 0 : null}
    on:mousedown={(event) => toggle(event)}
    on:keydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? toggle(event) : undefined}
    >{#if expanded}<slot name="expanded" />{:else}<slot
            name="collapsed"
        />{/if}</div
>

<style>
    .expandable {
        display: inline;
        cursor: pointer;
    }
</style>
