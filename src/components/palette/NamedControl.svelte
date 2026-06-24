<script lang="ts">
    import { type Snippet } from 'svelte';

    interface Props {
        name: Snippet;
        control: Snippet;
        /** When true, mark this control (e.g. the palette property the code caret is in). */
        highlighted?: boolean;
    }

    let { name, control, highlighted = false }: Props = $props();
</script>

<div class="property" class:caret-highlight={highlighted}>
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
        text-align: start;
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
