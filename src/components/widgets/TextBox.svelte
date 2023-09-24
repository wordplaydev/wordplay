<script lang="ts">
    import { onMount } from 'svelte';

    export let text: string;
    export let description: string;
    export let placeholder: string;
    export let done: (text: string) => void;

    let view: HTMLTextAreaElement | undefined;

    function resize() {
        if (view) {
            view.style.height = 'auto';
            view.style.height = `${view.scrollHeight}px`;
        }
    }

    onMount(() => resize());
</script>

<textarea
    title={description}
    aria-label={description}
    {placeholder}
    bind:value={text}
    bind:this={view}
    on:blur={() => done(text)}
    on:input={resize}
/>

<style>
    textarea {
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        border: none;
        border-left: var(--wordplay-focus-width) solid
            var(--wordplay-inactive-color);
        padding: var(--wordplay-spacing);
        width: 100%;
        resize: none;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
    }

    textarea:focus {
        outline: none;
        border-left-color: var(--wordplay-focus-color);
    }
</style>
