<script lang="ts">
    import Toggle from '@components/widgets/Toggle.svelte';
    import { locales } from '@db/Database';
    import { placeNearTarget } from '@components/widgets/placeNearTarget';
    import { tick, type Snippet } from 'svelte';

    /** Either a list of zero-arg snippets, OR a count + indexed renderer. */
    type ItemSource =
        | Snippet[]
        | { count: number; render: Snippet<[number]> };

    interface Props {
        /** Items that overflow into the hamburger popup one by one as space shrinks. */
        items: ItemSource;
        /** Optional always-visible item that fills remaining width (e.g. a slider). */
        stretchy?: Snippet;
        /** Minimum width reserved for the stretchy item, in CSS pixels.
         *  When set, items overflow into the popup as needed to preserve
         *  this minimum. */
        stretchyMin?: number;
        /** Optional always-visible items anchored to the inline start (left in LTR).
         *  These never go into the popup; everything else (items, hamburger,
         *  stretchy, pinned) is pushed to the inline-end by an auto margin. */
        pinnedStart?: Snippet[];
        /** Optional always-visible items anchored to the inline end (right in LTR). */
        pinned?: Snippet[];
        /** Where to pack items when they don't fill the available width.
         *  'start' (default) leaves empty space on the inline-end;
         *  'end' clusters items at the inline-end with empty space on the
         *  inline-start. */
        justify?: 'start' | 'end';
    }

    let {
        items,
        stretchy,
        stretchyMin = 0,
        pinnedStart = [],
        pinned = [],
        justify = 'start',
    }: Props = $props();

    const itemCount = $derived(
        Array.isArray(items) ? items.length : items.count,
    );

    function isArrayItems(x: ItemSource): x is Snippet[] {
        return Array.isArray(x);
    }

    let open = $state(false);
    // Start with all items visible; ResizeObserver corrects on first run.
    let visibleCount = $state(Infinity);

    let containerEl: HTMLDivElement | undefined = $state(undefined);
    let measureItemsEl: HTMLDivElement | undefined = $state(undefined);
    let measurePinnedEl: HTMLDivElement | undefined = $state(undefined);
    let measurePinnedStartEl: HTMLDivElement | undefined = $state(undefined);
    let toggleEl: HTMLSpanElement | undefined = $state(undefined);
    let panelEl: HTMLDivElement | undefined = $state(undefined);

    const panelId = `overflow-panel-${Math.random().toString(36).slice(2)}`;
    let panelLeft = $state(0);
    let panelTop = $state(0);

    const showButton = $derived(visibleCount < itemCount);

    $effect(() => {
        if (!containerEl || !measureItemsEl) return;
        void itemCount;
        void pinned.length;
        void pinnedStart.length;
        const eContainer = containerEl;
        const eItemsMeasure = measureItemsEl;
        const ePinnedMeasure = measurePinnedEl;
        const ePinnedStartMeasure = measurePinnedStartEl;

        const check = () => {
            const available = eContainer.clientWidth;
            if (available === 0) return;

            const itemEls = Array.from(eItemsMeasure.children) as HTMLElement[];
            if (itemEls.length !== itemCount) return;

            const gap =
                parseFloat(getComputedStyle(eContainer).columnGap) || 8;
            const itemWidths = itemEls.map((el) => el.offsetWidth);

            // Pinned items always reserve their measured width.
            let pinnedWidth = 0;
            if (ePinnedMeasure && pinned.length > 0) {
                const pinnedEls = Array.from(
                    ePinnedMeasure.children,
                ) as HTMLElement[];
                for (let i = 0; i < pinnedEls.length; i++) {
                    pinnedWidth +=
                        pinnedEls[i].offsetWidth + (i > 0 ? gap : 0);
                }
                pinnedWidth += gap; // gap before pinned group
            }

            // Pinned-start items reserve their measured width too.
            let pinnedStartWidth = 0;
            if (ePinnedStartMeasure && pinnedStart.length > 0) {
                const pinnedStartEls = Array.from(
                    ePinnedStartMeasure.children,
                ) as HTMLElement[];
                for (let i = 0; i < pinnedStartEls.length; i++) {
                    pinnedStartWidth +=
                        pinnedStartEls[i].offsetWidth + (i > 0 ? gap : 0);
                }
                pinnedStartWidth += gap; // gap after pinned-start group
            }

            // Reserve a minimum for the stretchy area. If the caller
            // provided `stretchyMin`, honor it (items overflow as needed
            // to keep the stretchy at least that wide); otherwise reserve
            // just 1px so flex:1 still gets something at render time.
            const reservedStretchy = stretchy
                ? Math.max(1, stretchyMin) + gap
                : 0;

            const itemsTotal = itemWidths.reduce(
                (s, w, i) => s + w + (i > 0 ? gap : 0),
                0,
            );

            const availableForItems =
                available - pinnedStartWidth - pinnedWidth - reservedStretchy;

            if (itemsTotal <= availableForItems) {
                visibleCount = itemCount;
                if (open) open = false;
                return;
            }

            // Reserve space for hamburger.
            const btnWidth = (toggleEl?.offsetWidth ?? 36) + gap;
            const target = availableForItems - btnWidth;

            let count = 0;
            let accumulated = 0;
            for (let i = 0; i < itemWidths.length; i++) {
                const next = accumulated + (i > 0 ? gap : 0) + itemWidths[i];
                if (next <= target) {
                    accumulated = next;
                    count++;
                } else {
                    break;
                }
            }
            visibleCount = count;
        };

        const observer = new ResizeObserver(check);
        observer.observe(eContainer);
        for (const child of eItemsMeasure.children) observer.observe(child);
        if (ePinnedMeasure)
            for (const child of ePinnedMeasure.children)
                observer.observe(child);
        if (ePinnedStartMeasure)
            for (const child of ePinnedStartMeasure.children)
                observer.observe(child);
        check();
        return () => observer.disconnect();
    });

    // Strip identifying attributes (`id`, `data-testid`, `data-uiid`) from
    // every descendant of the measurement divs. The measurement clones share
    // the same snippet bodies as the visible items, which means without this
    // pass each test selector matches twice (visible + clone) and Playwright
    // strict mode fails. Re-run on any DOM mutation so attributes added by
    // re-renders are stripped too.
    $effect(() => {
        const measureEls = [
            measureItemsEl,
            measurePinnedEl,
            measurePinnedStartEl,
        ].filter((el): el is HTMLDivElement => el !== undefined);

        const strip = (node: Element) => {
            if (node.hasAttribute('id')) node.removeAttribute('id');
            if (node.hasAttribute('data-testid'))
                node.removeAttribute('data-testid');
            if (node.hasAttribute('data-uiid'))
                node.removeAttribute('data-uiid');
            for (const child of node.children) strip(child);
        };

        const observers: MutationObserver[] = [];
        for (const root of measureEls) {
            strip(root);
            const observer = new MutationObserver(() => strip(root));
            observer.observe(root, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['id', 'data-testid', 'data-uiid'],
            });
            observers.push(observer);
        }

        return () => observers.forEach((o) => o.disconnect());
    });

    // Reposition the panel each time it opens or the toggle moves.
    $effect(() => {
        if (!open || !toggleEl) return;
        void open;
        tick().then(() => {
            if (!panelEl || !toggleEl) return;
            const rect = toggleEl.getBoundingClientRect();
            const pos = placeNearTarget(
                {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                },
                { width: panelEl.offsetWidth, height: panelEl.offsetHeight },
                { width: window.innerWidth, height: window.innerHeight },
            );
            panelLeft = pos.left;
            panelTop = pos.top;
        });
    });

    let focusedBefore: HTMLElement | null = null;

    async function doOpen() {
        focusedBefore =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        open = true;
        await tick();
        if (!panelEl) return;
        const first = panelEl.querySelector<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
        );
        (first ?? panelEl).focus();
    }

    function doClose() {
        open = false;
        focusedBefore?.focus();
    }

    // Use the capture phase for outside-click detection: bubble-phase
    // listeners are silenced when intermediate elements (e.g. StageView,
    // PhraseView) call event.stopPropagation() in their own pointerdown
    // handlers. Capture-phase fires from window down to the target *before*
    // any element's handler can stop propagation, so the popup still closes.
    $effect(() => {
        const handler = (e: PointerEvent) => {
            if (!open) return;
            const t = e.target as Node;
            if (!panelEl?.contains(t) && !toggleEl?.contains(t)) doClose();
        };
        window.addEventListener('pointerdown', handler, true);
        return () => window.removeEventListener('pointerdown', handler, true);
    });

    function handleWindowResize() {
        if (open) doClose();
    }

    function handlePanelKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.stopPropagation();
            doClose();
        }
    }

    // Move the popup to <body> so it escapes any ancestor stacking context
    // (transforms/filters on output content would otherwise clip it).
    function portalToBody(node: HTMLElement) {
        if (typeof document !== 'undefined') document.body.appendChild(node);
        return {
            destroy() {
                node.remove();
            },
        };
    }
</script>

<svelte:window onresize={handleWindowResize} />

<div
    class="overflow-toolbar"
    class:end={justify === 'end'}
    bind:this={containerEl}
>
    <!-- Pinned-start: always visible, anchored to inline start. An auto
         margin on the inline-end side pushes everything that follows to
         the inline-end. -->
    {#if pinnedStart.length > 0}
        <div class="pinned-start">
            {#each pinnedStart as p}
                {@render p()}
            {/each}
        </div>
    {/if}

    <!-- Visible items: as many as fit -->
    {#if isArrayItems(items)}
        {#each items.slice(0, visibleCount) as item}
            {@render item()}
        {/each}
    {:else}
        {#each Array.from( { length: Math.min(items.count, visibleCount) }, (_, i) => i ) as i}
            {@render items.render(i)}
        {/each}
    {/if}

    <!-- Hamburger: only shown when some items overflow -->
    {#if showButton}
        <span class="toggle-wrap" bind:this={toggleEl}>
            <Toggle
                tips={(l) => l.ui.widget.overflow.button}
                on={open}
                toggle={() => (open ? doClose() : doOpen())}
            >
                <span class="hamburger" class:open>☰</span>
            </Toggle>
        </span>
    {/if}

    <!-- Stretchy: always visible, fills remaining space. Placed after the
         hamburger but before pinned items. -->
    {#if stretchy}
        <div
            class="stretchy"
            style:min-width={stretchyMin > 0 ? `${stretchyMin}px` : null}
        >
            {@render stretchy()}
        </div>
    {/if}

    <!-- Pinned: always visible, anchored to inline end -->
    {#if pinned.length > 0}
        <div class="pinned">
            {#each pinned as p}
                {@render p()}
            {/each}
        </div>
    {/if}

    <!-- Hidden measurement: items + pinned, always rendered so widths are readable -->
    <div class="measure" aria-hidden="true" inert bind:this={measureItemsEl}>
        {#if isArrayItems(items)}
            {#each items as item}
                <div class="measure-item">{@render item()}</div>
            {/each}
        {:else}
            {#each Array.from({ length: items.count }, (_, i) => i) as i}
                <div class="measure-item">{@render items.render(i)}</div>
            {/each}
        {/if}
    </div>
    {#if pinned.length > 0}
        <div
            class="measure"
            aria-hidden="true"
            inert
            bind:this={measurePinnedEl}
        >
            {#each pinned as p}
                <div class="measure-item">{@render p()}</div>
            {/each}
        </div>
    {/if}
    {#if pinnedStart.length > 0}
        <div
            class="measure"
            aria-hidden="true"
            inert
            bind:this={measurePinnedStartEl}
        >
            {#each pinnedStart as p}
                <div class="measure-item">{@render p()}</div>
            {/each}
        </div>
    {/if}
</div>

{#if open && showButton}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="overflow-panel"
        id={panelId}
        role="group"
        aria-label={$locales.getPlainText((l) => l.ui.widget.overflow.popup)}
        tabindex="-1"
        style:left="{panelLeft}px"
        style:top="{panelTop}px"
        bind:this={panelEl}
        onkeydown={handlePanelKeyDown}
        use:portalToBody
    >
        {#if isArrayItems(items)}
            {#each items.slice(visibleCount) as item}
                {@render item()}
            {/each}
        {:else}
            {#each Array.from( { length: items.count - visibleCount }, (_, i) => i + visibleCount ) as i}
                {@render items.render(i)}
            {/each}
        {/if}
    </div>
{/if}

<style>
    .overflow-toolbar {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        position: relative;
        flex: 1 1 auto;
        min-width: 0;
        /* Clip horizontal overflow (so transient over-wide content during
           the initial measure tick doesn't leak into neighbors), but leave
           the vertical axis visible so children's drop-shadows that extend
           a pixel or two below the toolbar aren't sliced off. `clip` is
           the only value safe to combine with `visible` on the other axis. */
        overflow-x: clip;
        overflow-y: visible;
    }

    .overflow-toolbar.end {
        justify-content: flex-end;
    }

    .toggle-wrap {
        flex-shrink: 0;
    }

    .stretchy {
        /* Take all leftover horizontal space in the toolbar flex row. */
        flex: 1 1 0%;
        min-width: 0;
        /* Plain block so the snippet's content (typically a single full-
           width child like the Timeline slider) fills this box at default
           block-layout width:auto. No secondary flex layout. */
    }

    .pinned-start {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-shrink: 0;
        /* Consume any free space on the inline-end side so subsequent
           flex items (regular items, hamburger, stretchy, pinned) are
           pushed against the inline-end of the toolbar. */
        margin-inline-end: auto;
    }

    .pinned {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-shrink: 0;
        margin-inline-start: auto; /* push to inline end when no stretchy */
    }

    /* When pinnedStart is present, its own `margin-inline-end: auto` already
       consumes all the free space and pushes everything else to the
       inline-end. If `.pinned` also has `margin-inline-start: auto`, the
       two auto margins split the free space 50/50 — leaving the regular
       items stranded in the middle. Cancel the pinned auto margin in that
       case so items, hamburger, and pinned cluster against the inline-end
       together. */
    .overflow-toolbar:has(.pinned-start) .pinned {
        margin-inline-start: 0;
    }

    /* Measure divs mirror toolbar flex so intra-item gaps are included. */
    .measure {
        visibility: hidden;
        position: absolute;
        pointer-events: none;
        left: 0;
        top: 0;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .measure-item {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-shrink: 0;
    }

    .hamburger {
        display: inline-block;
        transition: rotate calc(var(--animation-factor) * 150ms);
    }

    .hamburger.open {
        rotate: 90deg;
    }

    .overflow-panel {
        position: fixed;
        /* Portaled to <body> so it escapes any ancestor stacking context.
           Hint.svelte (the tooltip layer) is also a body-level child and
           uses z-index: 3 — so we sit at 2 to stay above page/stage
           content but below the tooltip for buttons inside the popup. */
        z-index: 2;
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        box-shadow: 2px 2px 0 var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--wordplay-spacing);
        /* Inheritable typography is set on .root (in +layout.svelte) which
           the portaled panel escapes — re-apply explicitly so contents
           render with the app font, not the browser default. */
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        font-size: var(--wordplay-font-size);
        color: var(--wordplay-foreground);
    }
</style>
