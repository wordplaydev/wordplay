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
        checkPluralBranches,
        checkTemplateInputs,
        getDeclaredInputs,
        getPluralBranches,
        withoutCountMarker,
    } from '@locale/templateInputs';
    import { getPluralCategories, getPluralExamples } from '@locale/plurals';
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

    /** The plural forms of the language being translated into — how many
     *  versions of a count-bearing sentence this locale needs. */
    const language = $derived($locales.getLanguages()[0] ?? '');
    const categories = $derived(getPluralCategories(language));
    const examples = $derived(getPluralExamples(language));

    /** Live plural check, sharing its rule with the locale verifier. */
    const plural = $derived(
        path !== undefined
            ? checkPluralBranches(path, text, categories.length)
            : undefined,
    );

    /** Whether a declared name is a count, whose branch chooses a plural form. */
    function isCount(name: string) {
        return name.startsWith('#');
    }

    /**
     * What this draft says for each plural form, so a translator can read back
     * every version they've written — with the number that selects it. A form
     * they haven't written yet shows as blank rather than silently falling back.
     */
    const preview = $derived.by(() => {
        if (plural === undefined || !text.includes('$#')) return undefined;
        const branch = getPluralBranches(text)[0];
        if (branch === undefined) return undefined;
        return categories.map((category, index) => ({
            category,
            example: examples[index],
            text: $locales
                .concretize(text, {
                    ...Object.fromEntries(
                        (declared ?? []).map((name) => [
                            withoutCountMarker(name),
                            `$${withoutCountMarker(name)}`,
                        ]),
                    ),
                    [branch.name]: examples[index],
                })
                .toText(),
        }));
    });

    /** Insert `$<name>` at the editor's caret (or append if no caret). A count
     *  inserts the whole branch, with one empty slot per plural form — the
     *  shape is the part a translator can't be expected to know. */
    function insertAt(name: string) {
        const insert = isCount(name)
            ? `$#${withoutCountMarker(name)}[${categories.map(() => '').join('|')}]`
            : `$${name}`;
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
                {@const plain = withoutCountMarker(name)}
                {@const used = !check.unused.includes(plain)}
                {@const count = isCount(name)}
                <li>
                    <button
                        type="button"
                        class="chip"
                        class:used
                        class:count
                        disabled={!interactive}
                        title={count
                            ? $locales
                                  .concretize(
                                      (l) => l.ui.localize.inputs.plural.tip,
                                      {
                                          forms: categories.length,
                                      },
                                  )
                                  .toText()
                            : $locales.getPlainText(
                                  used
                                      ? (l) => l.ui.localize.inputs.usedTip
                                      : (l) => l.ui.localize.inputs.unusedTip,
                              )}
                        onclick={interactive ? () => insertAt(name) : undefined}
                    >
                        <span class="dot" aria-hidden="true"></span>
                        ${count ? '#' : ''}{plain}
                    </button>
                </li>
            {/each}
        </ul>
        {#if !compact && preview !== undefined}
            <!-- What the draft says for each plural form, with a number that
                 selects it. Without this a translator writing six Arabic
                 versions has no way to check which one they're editing. -->
            <h3>
                {$locales.getPlainText(
                    (l) => l.ui.localize.inputs.plural.header,
                )}
            </h3>
            <ul class="forms">
                {#each preview as form (form.category)}
                    <li>
                        <span class="category">{form.category}</span>
                        <span class="example"
                            >{$locales.getPlainText(
                                (l) => l.ui.localize.inputs.plural.example,
                            )}
                            {form.example}</span
                        >
                        <span class="rendered">{form.text}</span>
                    </li>
                {/each}
            </ul>
        {/if}
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
        {#if !compact && plural !== undefined && (plural.arity.length > 0 || plural.missing.length > 0)}
            <Notice>
                <p>
                    {#each plural.arity as problem (problem.name)}
                        {$locales
                            .concretize(
                                (l) => l.ui.localize.inputs.plural.arity,
                                {
                                    name: `$#${problem.name}`,
                                    found: problem.found,
                                    expected: problem.expected,
                                },
                            )
                            .toText()}{' '}
                    {/each}
                    {#each plural.missing as name (name)}
                        {$locales
                            .concretize(
                                (l) => l.ui.localize.inputs.plural.missing,
                                { name: `$${name}` },
                            )
                            .toText()}{' '}
                    {/each}
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

    .forms {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--wordplay-spacing) / 4);
    }

    .forms li {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: calc(var(--wordplay-spacing) / 2);
    }

    .category {
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-small-font-size);
    }

    .example {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
    }

    .rendered {
        /* The rendered sentence is the point of the row, so it gets the
           readable weight and wraps freely. */
        flex: 1 1 12em;
    }
</style>
