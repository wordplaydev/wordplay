<script lang="ts">
    import type ExternalExample from '@nodes/ExternalExample';
    import { contrastLanguage } from '@db/Database';
    import { getContrastLanguage } from '../../tutorial/ContrastLanguage';
    import { highlightExternal } from './highlightExternal';

    interface Props {
        example: ExternalExample;
    }

    let { example }: Props = $props();

    // The variant matching the creator's chosen contrast language (falling back to Python).
    let entry = $derived(example.getEntry($contrastLanguage));
    let language = $derived(
        entry ? getContrastLanguage(entry.tag) : undefined,
    );

    // Highlighted HTML when the language has a grammar; otherwise undefined (render code plain).
    let highlighted = $state<string | undefined>(undefined);
    $effect(() => {
        const current = entry;
        const grammar = language?.hljs;
        highlighted = undefined;
        if (current && grammar) {
            highlightExternal(grammar, current.code).then((html) => {
                // Ignore a stale result if the chosen language changed meanwhile.
                if (entry === current) highlighted = html;
            });
        }
    });
</script>

{#if entry}
    <div class="external-example">
        {#if language}<span class="lang">{language.label}</span>{/if}
        <pre class="code"><code class="hljs"
                >{#if highlighted}{@html highlighted}{:else}{entry.code}{/if}</code
            ></pre>
    </div>
{/if}

<style>
    .external-example {
        display: flex;
        flex-direction: column;
        gap: calc(var(--wordplay-spacing) / 2);
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-background);
        overflow-x: auto;
    }

    .lang {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
    }

    .code {
        margin: 0;
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-font-size);
        /* Preserve authored newlines but wrap long lines so code fits the narrow speech bubble. */
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        color: var(--wordplay-foreground);
    }

    /* Map highlight.js token classes onto Wordplay's palette so foreign code matches the app
       (and follows light/dark) without importing an hljs theme. */
    .code :global(.hljs-keyword),
    .code :global(.hljs-built_in),
    .code :global(.hljs-literal) {
        color: var(--wordplay-operator-color);
    }
    .code :global(.hljs-string),
    .code :global(.hljs-number),
    .code :global(.hljs-regexp) {
        color: var(--color-blue);
    }
    .code :global(.hljs-comment) {
        color: var(--wordplay-inactive-color);
        font-style: italic;
    }
    .code :global(.hljs-title),
    .code :global(.hljs-title.function_),
    .code :global(.hljs-attr),
    .code :global(.hljs-property) {
        color: var(--wordplay-relation-color);
    }
    .code :global(.hljs-type),
    .code :global(.hljs-params) {
        color: var(--wordplay-type-color);
    }
</style>
