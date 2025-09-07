<script lang="ts">
    import { type Snippet } from 'svelte';

    interface Props {
        name: Snippet;
        control: Snippet;
    }

    let { name, control }: Props = $props();
</script>

<div class="property">
    <h3 class="name">{@render name()}</h3>
    <div class="control">{@render control()} </div>
</div>

<style>
    .property {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        user-select: none;
    }

    .name {
        flex-basis: 5em;
        text-align: left;
        margin: 0;
        white-space: nowrap;
    }

    .control {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
