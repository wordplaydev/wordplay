<script module lang="ts">
    import type {
        MultilingualEntry,
        MultilingualMarkup,
    } from '@locale/Locales';
    import type Markup from '@nodes/Markup';

    /** One line of a tooltip. `language`/`direction` are set for per-locale echoes and
     *  omitted for plain/computed tips. `markup` renders rich content; otherwise `text`
     *  is shown as plain text. */
    export type HintEntry = {
        text?: string;
        markup?: Markup;
        language?: string;
        direction?: 'ltr' | 'rtl';
    };

    export class ActiveHint {
        private entries: HintEntry[] = $state([]);
        private view: HTMLElement | undefined = $state(undefined);
        /** A keyboard shortcut shown once after the primary locale (it's universal, not
         *  per-locale), so a shortcut needn't force a single computed tip string. */
        private shortcut: string | undefined = $state(undefined);

        /** Show a single plain string (a computed tip, or an already-joined label). */
        show(text: string, view: HTMLElement) {
            this.entries = text.length > 0 ? [{ text }] : [];
            this.shortcut = undefined;
            this.view = view;
        }

        /** Show one plain-text entry per chosen locale, each tagged with its
         *  language/direction so the popup can stack them smaller and dimmed. */
        showMultilingual(entries: MultilingualEntry[], view: HTMLElement) {
            this.entries = entries;
            this.shortcut = undefined;
            this.view = view;
        }

        /** Like {@link showMultilingual}, but each entry renders rich `Markup`. An optional
         *  keyboard shortcut is shown inline after the primary locale. */
        showMarkup(
            entries: MultilingualMarkup[],
            view: HTMLElement,
            shortcut?: string,
        ) {
            this.entries = entries;
            this.shortcut = shortcut;
            this.view = view;
        }

        hide() {
            this.entries = [];
            this.shortcut = undefined;
            this.view = undefined;
        }

        getEntries() {
            return this.entries;
        }

        getShortcut() {
            return this.shortcut;
        }

        getView() {
            return this.view;
        }

        isActive() {
            return this.view !== undefined;
        }
    }
</script>

<script lang="ts">
    import { browser } from '$app/environment';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getTip } from '@components/project/Contexts';
    import { placeNearTarget } from '@components/widgets/placeNearTarget';
    import { onDestroy } from 'svelte';

    interface Props {
        /** True when this Hint is rendered inside a <dialog>. Only shows tooltips whose
         * target is also inside a dialog; the global Hint (inDialog=false) handles the rest. */
        inDialog?: boolean;
    }

    let { inDialog = false }: Props = $props();

    const tip = getTip();

    const bounds = $state<{
        top: number | undefined;
        left: number | undefined;
    }>({
        top: 0,
        left: 0,
    });

    let width = $state<number | undefined>(undefined);
    let height = $state<number | undefined>(undefined);

    function update() {
        // If there's a target and it's not in the document anymore, hide the tooltip.
        if (target && !document.contains(target)) tip.hide();
    }

    let observer = $state.raw(
        browser ? new MutationObserver(update) : undefined,
    );

    const target = $derived(tip.getView());

    // Only show this Hint instance when the target's dialog-membership matches ours:
    // the dialog Hint shows targets inside a dialog; the global Hint shows all others.
    const shouldShow = $derived(
        target !== undefined &&
            inDialog === (target.closest('dialog') !== null),
    );

    onDestroy(() => {
        observer?.disconnect();
    });

    $effect(() => {
        if (target && shouldShow) {
            // Listen to the document children changes so we hear about the target being removed.
            observer?.observe(document.body, {
                subtree: true,
                childList: true,
            });

            if (width === undefined || height === undefined) {
                bounds.top = 0;
                bounds.left = 0;
                return;
            }

            // Position against the viewport using the target's live on-screen
            // rect. The in-dialog hint is rendered with `position: fixed` (see
            // CSS below), so these viewport coordinates stay aligned with the
            // target regardless of how the dialog or any inner container is
            // scrolled — no scroll-offset math required.
            const rect = target.getBoundingClientRect();
            const { left, top } = placeNearTarget(
                {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                },
                { width, height },
                { width: window.innerWidth, height: window.innerHeight },
            );
            bounds.top = top;
            bounds.left = left;
        }
    });
</script>

<!-- Show if there's a target and this hint's dialog scope matches the target's. -->
{#if shouldShow}
    <!-- Hide it from screen readers. They get aria-labels. -->
    <div
        class="hint"
        role="presentation"
        bind:offsetWidth={width}
        bind:offsetHeight={height}
        class:visible={width !== undefined && width > 0}
        style:left={`${bounds.left ?? 0}px`}
        style:top={`${bounds.top ?? 0}px`}
        >{#each tip.getEntries() as entry, i}<span
                class="hint-entry"
                class:secondary={i > 0}
                lang={entry.language}
                dir={entry.direction}
                style="font-size: {0.8 ** i}em"
                >{#if entry.markup}<MarkupHTMLView
                        markup={entry.markup}
                        inline
                    />{:else}{entry.text}{/if}{#if i === 0 && tip.getShortcut()}
                    <!-- A breakable space before the shortcut, which wraps as
                         one unit (see .hint-shortcut): glued with a no-break
                         space, a label + shortcut wider than the hint's
                         max-width overflowed the box, eating the right
                         padding. -->
                    <span class="hint-shortcut">({tip.getShortcut()})</span
                    >{/if}</span
            >{/each}</div
    >
{/if}

<style>
    .hint {
        /* Fixed (viewport-relative) so the tooltip stays aligned with its
           target regardless of how an enclosing dialog or container is
           scrolled. The position is computed from the target's live
           getBoundingClientRect() in viewport coordinates. */
        position: fixed;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        /* Restate the link colors, don't inherit them. A tooltip can be raised
           from inside a surface that recolored its links for its own
           background, and a custom property keeps inheriting long after that
           background has been painted over. Resetting `color` alone is what
           left concept links black on black: the prose came back but the links
           kept the surface's value. Anything that paints its own background
           owes its links the same. */
        --wordplay-link-color: currentColor;
        --wordplay-link-underline-color: transparent;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        font-size: var(--wordplay-small-font-size);
        font-family: var(--wordplay-app-font);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        max-width: 12em;
        /* A backstop for words longer than the box in any locale: break them
           rather than letting them spill past the padding. */
        overflow-wrap: break-word;
        user-select: none;
        pointer-events: none;
        z-index: 3;
        animation: appear 0.25s ease-in-out;
        box-shadow: 2px 2px 5px var(--wordplay-chrome);
        opacity: 0;
    }

    .hint.visible {
        opacity: 1;
    }

    /* Each chosen locale on its own line; secondaries dimmed (and sized per-entry). */
    .hint-entry {
        display: block;
    }

    /* Dimming secondary-locale echoes and the shortcut suffix has to stay
       above AA: opacity multiplies against the background, so 0.7 over already
       grey-ish text lands at ~3:1 and axe fails it. 0.92 still reads as
       secondary while keeping the text legible. */
    .hint-entry.secondary {
        opacity: 0.92;
    }

    .hint-shortcut {
        opacity: 0.92;
        /* Wrap onto its own line as a whole rather than breaking inside the
           key sequence — or, glued to the label, overflowing the box. */
        display: inline-block;
        white-space: nowrap;
    }

    @keyframes appear {
        0% {
            opacity: 0;
        }
        60% {
            opacity: 0;
        }
        80% {
            opacity: 0.5;
        }
        100% {
            opacity: 1;
        }
    }
</style>
