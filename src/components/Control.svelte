<script lang="ts">
    export let selected: () => void;
</script>

<div
    class="control"
    tabIndex="0"
    on:click={selected}
    on:keydown={(event) =>
        event.key === ' ' || event.key === 'Enter' ? selected() : undefined}
>
    <slot />
</div>

<style>
    .control {
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
        background: var(--wordplay-chrome);
        text-align: center;
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
        transition: transform 0.25s ease-out;
        user-select: none;
    }
</style>
