<script lang="ts">
    import { onMount } from 'svelte';

    interface Props {
        text: string;
        description: string;
        placeholder: string;
        done: (text: string) => void;
    }

    let {
        text = $bindable(),
        description,
        placeholder,
        done
    }: Props = $props();

    let view: HTMLTextAreaElement | undefined = $state();

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
    onblur={() => done(text)}
    oninput={resize}
></textarea>

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
