<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        text: string;
        description: LocaleTextAccessor;
        placeholder: LocaleTextAccessor;
        active?: boolean;
        inline?: boolean;
        done?: (text: string) => void;
        dwelled?: undefined | ((text: string) => void);
        validator?: undefined | ((text: string) => LocaleTextAccessor | true);
        id: string;
        view?: HTMLTextAreaElement | undefined;
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
        view = $bindable(undefined),
    }: Props = $props();

    let focused = $state(false);
    let title = $derived($locales.get(description));

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
            setTimeout(() => {
                if (dwelled) dwelled(text);
            }, 1000);
    }

    function resize() {
        if (view) {
            view.style.height = 'auto';
            view.style.height = `${view.scrollHeight}px`;
        }
    }

    $effect(() => {
        if (text.length >= 0) resize();
    });
</script>

<div class="box" {id} class:focused>
    <textarea
        {title}
        aria-label={title}
        aria-invalid={message !== undefined}
        aria-describedby="{id}-error"
        placeholder={$locales.get(placeholder)}
        class={{ inline, error: message !== undefined }}
        bind:value={text}
        bind:this={view}
        aria-disabled={!active}
        rows={text.split('\n').length}
        disabled={!active}
        onblur={() => {
            if (done) done(text);
            focused = false;
        }}
        onfocus={() => (focused = true)}
        oninput={handleInput}
        onkeydown={(e) => e.stopPropagation()}
    ></textarea>
    {#if message !== undefined}
        <div class="message" id="id-{id}">{$locales.get(message)}</div>
    {/if}
</div>

<style>
    .box {
        position: relative;
        width: 100%;
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
        min-width: 3em;
        min-height: 2em;
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
        font-size: calc(var(--wordplay-small-font-size));
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        z-index: 2;
    }
</style>
