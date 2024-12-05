<script lang="ts">
    import { getInteractive } from '@components/project/Contexts';
    import { type Snippet } from 'svelte';

    interface Props {
        expanded: Snippet;
        collapsed: Snippet;
    }

    let { expanded, collapsed }: Props = $props();

    let all = $state(false);

    function toggle(event: Event) {
        if (!interactive.interactive) return;
        all = !all;
        event.stopPropagation();
    }

    const interactive = getInteractive();
</script>

<div
    role="button"
    class="expandable"
    tabindex={interactive.interactive ? 0 : null}
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
