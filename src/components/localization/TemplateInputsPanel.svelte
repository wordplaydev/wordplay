<script lang="ts">
    /**
     * Translator UI for template-input enforcement. When the active locale
     * field is typed as `Template<Names>`, this panel:
     *
     *  - Shows one chip per declared `$name`, with a status dot (green =
     *    referenced in the current draft, red = not yet).
     *  - Reports a one-line notice listing inputs that the draft is missing,
     *    any legacy `$N` numeric refs, and any `$name` refs that aren't
     *    declared and aren't terminology (typos / made-up names).
     *  - Clicking a chip inserts `$name` at the editor's current caret.
     *
     * Submit-gating lives at the call site (the editor wires `clean` into the
     * Submit button's `active` prop).
     */
    import { locales } from '@db/Database';
    import {
        checkTemplateInputs,
        getDeclaredInputs,
    } from '@locale/templateInputs';
    import Notice from '@components/app/Notice.svelte';

    interface Props {
        /** Dotted locale path being edited, e.g. `node.Bind.conflict.IncompatibleType.explanation`. */
        path: string | undefined;
        /** The draft text the translator has typed. */
        text: string;
        /**
         * The editor's underlying input / textarea, so the panel can insert
         * `$name` at the caret. When undefined (e.g. FormattedEditor in
         * preview mode), the panel hides entirely — chips don't help when
         * there's no editor to insert into.
         */
        view: HTMLInputElement | HTMLTextAreaElement | undefined;
        /** Called after a chip insert so the caller can sync any reactive state. */
        oninsert?: (newText: string) => void;
        /** Compact mode: chip row only, no header or notice. Used by the
         *  in-context Localizer overlay where space is tight. */
        compact?: boolean;
    }

    let { path, text, view, oninsert, compact = false }: Props = $props();

    /** The declared input names for this field, or `undefined` if not templated. */
    const declared = $derived(
        path !== undefined ? getDeclaredInputs().get(path) : undefined,
    );

    /**
     * Live check result for the current draft. `undefined` when the field
     * isn't Template-typed (panel hides). `numeric` lists legacy `$N` refs
     * still in the draft; `unused` lists declared names not yet referenced.
     */
    const check = $derived(
        path !== undefined ? checkTemplateInputs(path, text) : undefined,
    );

    /** Insert `$<name>` at the editor's caret (or append if no caret). */
    function insertAt(name: string) {
        const insert = `$${name}`;
        if (view) {
            const start = view.selectionStart ?? text.length;
            const end = view.selectionEnd ?? text.length;
            const next = text.slice(0, start) + insert + text.slice(end);
            oninsert?.(next);
            // After Svelte re-renders the text, restore caret to just after
            // the inserted token so successive inserts stack naturally.
            queueMicrotask(() => {
                if (view) {
                    const caret = start + insert.length;
                    view.focus();
                    view.setSelectionRange(caret, caret);
                }
            });
        } else {
            oninsert?.(text + insert);
        }
    }
</script>

{#if declared !== undefined && declared.length > 0 && check !== undefined && (view !== undefined || compact)}
    {@const interactive = view !== undefined}
    <div class="template-inputs" class:compact>
        {#if !compact}
            <h3>
                {$locales.getPlainText((l) => l.ui.localize.inputs.header)}
            </h3>
        {/if}
        <ul class="chips">
            {#each declared as name (name)}
                {@const used = !check.unused.includes(name)}
                <li>
                    <button
                        type="button"
                        class="chip"
                        class:used
                        disabled={!interactive}
                        title={$locales.getPlainText(
                            used
                                ? (l) => l.ui.localize.inputs.usedTip
                                : (l) => l.ui.localize.inputs.unusedTip,
                        )}
                        onclick={interactive ? () => insertAt(name) : undefined}
                    >
                        <span class="dot" aria-hidden="true"></span>
                        ${name}
                    </button>
                </li>
            {/each}
        </ul>
        {#if !compact && (check.unused.length > 0 || check.numeric.length > 0 || check.unknown.length > 0)}
            <Notice>
                <p>
                    {#if check.unused.length > 0}
                        {$locales.getPlainText(
                            (l) => l.ui.localize.inputs.missing,
                        )}
                        <strong
                            >{check.unused
                                .map((n) => `$${n}`)
                                .join(', ')}</strong
                        >.
                    {/if}
                    {#if check.numeric.length > 0}
                        {' '}
                        {$locales.getPlainText(
                            (l) => l.ui.localize.inputs.legacy,
                        )}
                        <strong
                            >{check.numeric
                                .map((n) => `$${n}`)
                                .join(', ')}</strong
                        >.
                    {/if}
                    {#if check.unknown.length > 0}
                        {' '}
                        {$locales.getPlainText(
                            (l) => l.ui.localize.inputs.unknown,
                        )}
                        <strong
                            >{check.unknown
                                .map((n) => `$${n}`)
                                .join(', ')}</strong
                        >.
                    {/if}
                </p>
            </Notice>
        {/if}
    </div>
{/if}

<style>
    .template-inputs {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-block-start: var(--wordplay-spacing);
    }

    .template-inputs.compact {
        flex-direction: row;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
        margin-block-start: 0;
    }

    h3 {
        font-size: var(--wordplay-small-font-size);
        font-weight: normal;
        color: var(--wordplay-inactive-color);
        margin: 0;
    }

    .chips {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--wordplay-spacing) / 2);
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
        padding: calc(var(--wordplay-spacing) / 4)
            calc(var(--wordplay-spacing) / 2);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-small-font-size);
        cursor: pointer;
    }

    .chip:hover,
    .chip:focus-visible {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        outline-offset: var(--wordplay-focus-width);
    }

    .dot {
        width: 0.5em;
        height: 0.5em;
        border-radius: 50%;
        background: var(--wordplay-error);
        flex: 0 0 auto;
    }

    .chip.used .dot {
        background: var(--wordplay-success, currentColor);
    }
</style>
