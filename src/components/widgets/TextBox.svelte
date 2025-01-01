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
        validator?: undefined | ((text: string) => string | true);
        id: string;
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
        id,
    }: Props = $props();

    let view: HTMLTextAreaElement | undefined = $state();
    let focused = $state(false);

    let timeout: NodeJS.Timeout | undefined = undefined;

    /** The message to display if invalid */
    let message = $derived.by(() => {
        if (validator) {
            const message = validator(text);
            if (message === true) return undefined;
            else return message;
        } else return undefined;
    });

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

<div class="box" {id} class:focused>
    <textarea
        title={description}
        aria-label={description}
        aria-invalid={message !== undefined}
        aria-describedby="{id}-error"
        {placeholder}
        class={{ inline, error: message !== undefined }}
        bind:value={text}
        bind:this={view}
        aria-disabled={!active}
        rows={1}
        disabled={!active}
        onblur={() => {
            if (done) done(text);
            focused = false;
        }}
        onfocus={() => (focused = true)}
        oninput={handleInput}
    ></textarea>
    {#if message !== undefined}
        <div class="message" id="id-{id}">{message}</div>
    {/if}
</div>

<style>
    .box {
        position: relative;
    }
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

    .message {
        display: none;
    }

    .focused .message {
        display: block;
        position: absolute;
        top: 100%;
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        font-size: calc(var(--wordplay-small-font-size) - 2pt);
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        z-index: 2;
    }
</style>
