<script lang="ts">
    import { onMount } from 'svelte';

    interface Props {
        text: string;
        description: string;
        placeholder: string;
        active?: boolean;
        inline?: boolean;
        done?: (text: string) => void;
        dwelled?: undefined | ((text: string) => void);
        validator?: undefined | ((text: string) => boolean);
    }

    let {
        text = $bindable(),
        description,
        placeholder,
        done = undefined,
        validator = undefined,
        active = true,
        inline = false,
        dwelled = undefined,
    }: Props = $props();

    let view: HTMLTextAreaElement | undefined = $state();

    let timeout: NodeJS.Timeout | undefined = undefined;

    function handleInput() {
        if (dwelled)
            timeout = setTimeout(() => {
                if (dwelled) dwelled(text);
            }, 1000);

        resize();
    }

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
    class={{ inline, error: validator ? validator(text) === false : null }}
    bind:value={text}
    bind:this={view}
    aria-disabled={!active}
    rows={1}
    disabled={!active}
    onblur={() => (done ? done(text) : undefined)}
    oninput={handleInput}
></textarea>

<style>
    textarea {
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        border: none;
        border-left: var(--wordplay-focus-width) solid
            var(--wordplay-inactive-color);
        padding-left: var(--wordplay-spacing);
        width: 100%;
        resize: none;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
    }

    .inline {
        width: auto;
    }

    textarea::placeholder {
        font-style: italic;
        color: var(--wordplay-inactive-color);
        font-family: var(--wordplay-app-font);
    }

    textarea[aria-disabled='true'] {
        background: var(--wordplay-inactive-color);
    }

    .error {
        color: var(--wordplay-error);
        border-color: var(--wordplay-error);
    }

    /* Needs to be last to override the error color */
    textarea:focus {
        outline: none;
        border-left-color: var(--wordplay-focus-color);
    }
</style>
