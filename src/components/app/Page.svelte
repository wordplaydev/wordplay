<script lang="ts">
    import { page } from '$app/state';
    import CreatorView from '@components/app/CreatorView.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import Logo from '@components/app/Logo.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import Link from '@components/app/Link.svelte';
    import Status from '@components/app/Status.svelte';
    import Localizer from '@components/localization/Localizer.svelte';
    import {
        getLocalizing,
        getUser,
        isAuthenticated,
        setFullscreen,
        type FullscreenContext,
    } from '@components/project/Contexts';
    import LocaleChooser from '@components/settings/LocaleChooser.svelte';
    import Notifications from '@components/settings/Notifications.svelte';
    import Settings from '@components/settings/Settings.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import {
        DOCUMENTATION_SYMBOL,
        LEARN_SYMBOL,
        PROJECT_SYMBOL,
        STAGE_SYMBOL,
        SYMBOL_SYMBOL,
        TEACH_SYMBOL,
    } from '@parser/Symbols';
    import scrollKeyAction, {
        nextScrollTarget,
        scrollBehaviorFor,
        scrollDuration,
        scrollPosition,
    } from '@components/app/scrollKeys';
    import { animationFactor } from '@db/Database';
    import { localeGoto } from '@util/localeGoto';
    import { type Snippet } from 'svelte';
    import { writable } from 'svelte/store';
    import { slide } from 'svelte/transition';

    interface Props {
        children: Snippet;
        footer?: boolean;
        /** False for pages that fill the viewport and scroll internally (the
         *  project view), so the page's own scroller can't be panned. */
        scroll?: boolean;
    }

    let { children, footer = true, scroll = true }: Props = $props();

    /**
     * The tabs arrive and leave rather than blinking in and out — they slide up
     * into the bar when the page's own copy of the same destinations scrolls
     * away, and back down when it returns.
     *
     * Leaving needs the tabs to outlive `footer` going false, so `showNav`
     * trails it by the length of the animation; nothing focusable lingers,
     * because the exit is short and ends in an unmount. Motion-gated: at factor
     * 0 the timeout is zero and both directions are instant.
     */
    let navPhase: 'in' | 'out' | undefined = $state(undefined);
    // svelte-ignore state_referenced_locally
    let showNav = $state(footer);
    // Deliberately the initial value: this records what `footer` was on the
    // previous run so the effect can tell a change from a re-render.
    // svelte-ignore state_referenced_locally
    let hadFooter = footer;
    $effect(() => {
        const wanted = footer;
        if (wanted === hadFooter) return;
        hadFooter = wanted;
        const duration = 400 * $animationFactor;
        if (wanted) {
            showNav = true;
            navPhase = 'in';
            const settle = setTimeout(() => (navPhase = undefined), duration);
            return () => clearTimeout(settle);
        }
        navPhase = 'out';
        const settle = setTimeout(() => {
            showNav = false;
            navPhase = undefined;
        }, duration);
        return () => clearTimeout(settle);
    });

    let main: HTMLElement | undefined = $state();
    let scrollY = $state(0);
    let showBackToTop = $derived(scrollY > 200);

    function scrollToTop() {
        main?.scrollTo({
            top: 0,
            behavior: scrollBehaviorFor($animationFactor),
        });
    }

    // Set a fullscreen flag to indicate whether footer should hide or not.
    // It's the responsibility of children componets to set this based on their state.
    // It's primarily ProjectView that does this.
    let fullscreen: FullscreenContext = writable({
        on: false,
        background: null,
        foreground: null,
    });
    setFullscreen(fullscreen);

    const localizing = getLocalizing();
    const user = getUser();

    $effect(() => {
        if (typeof document !== 'undefined' && $fullscreen) {
            document.body.style.background = $fullscreen.on
                ? ($fullscreen.background ?? '')
                : '';
            document.body.style.color = $fullscreen.on
                ? ($fullscreen.foreground ?? '')
                : '';
        }
    });

    /** Where a run of scroll keys is heading, so auto-repeat accumulates instead of
     *  restarting the animation each press. Undefined once the scroll settles or
     *  the reader scrolls by some other means. */
    let scrollTarget: number | undefined = undefined;
    let scrollFrame: number | undefined = undefined;

    /** The reader took over — a wheel, a drag, a touch. Abandon our animation and
     *  the target with it, so the next key press resumes from where they are. */
    function forgetScrollTarget() {
        if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
        scrollFrame = undefined;
        scrollTarget = undefined;
    }

    /** A scroll finished. Ours emit these too — every frame we write is a scroll
     *  that can end — so ignore it while our own animation is still running,
     *  which would otherwise cancel it after a single frame. */
    function handleScrollSettled() {
        if (scrollFrame === undefined) scrollTarget = undefined;
    }

    /** Animate to `to` ourselves rather than using `behavior: 'smooth'`, whose
     *  duration grows with distance — a target several pages away crawled, and
     *  its ease-in start made even the first page feel like it lagged. */
    function scrollTowards(element: HTMLElement, to: number) {
        if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
        if (scrollBehaviorFor($animationFactor) === 'auto') {
            scrollFrame = undefined;
            element.scrollTop = to;
            scrollTarget = undefined;
            return;
        }
        const from = element.scrollTop;
        const duration = scrollDuration(to - from);
        const started = performance.now();
        const step = () => {
            const elapsed = performance.now() - started;
            element.scrollTop = scrollPosition(from, to, elapsed, duration);
            if (elapsed < duration) scrollFrame = requestAnimationFrame(step);
            else {
                scrollFrame = undefined;
                scrollTarget = undefined;
            }
        };
        scrollFrame = requestAnimationFrame(step);
    }

    /** Elements that consume the document-scrolling keys themselves: text entry,
     *  pickers and menus that move a selection, and the code editor, which binds
     *  every one of them to a caret movement. */
    const KeyOwners =
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="listbox"], [role="menu"], [role="radiogroup"], [role="tablist"], [data-uiid="stage"], [data-testid="editor"]';

    /**
     * Whether something other than the page should answer a scroll key: a control
     * that binds them, or a scrollable region the reader is actually inside.
     * Walks only as far as `main` — beyond it, the page is the scroller.
     */
    function ownsScrollKeys(element: Element | null): boolean {
        if (element === null || element === document.body || main === undefined)
            return false;
        if (element.closest(KeyOwners) !== null) return true;
        for (
            let ancestor: Element | null = element;
            ancestor !== null && ancestor !== main;
            ancestor = ancestor.parentElement
        ) {
            const overflow = getComputedStyle(ancestor).overflowY;
            if (
                (overflow === 'auto' || overflow === 'scroll') &&
                ancestor.scrollHeight > ancestor.clientHeight
            )
                return true;
        }
        return false;
    }

    /**
     * The app shell is pinned so the document never scrolls (see app.html), which
     * leaves the browser's document-scrolling keys with nothing to act on: on a
     * freshly loaded page, Page Down did nothing until you clicked. Route them to
     * `main` ourselves.
     *
     * This runs whatever has focus, not just the body. Left to the browser, the
     * page scrolled a different distance and instantly once the reader had tabbed
     * to a link — so how far a page key moved depended on what happened to be
     * focused. It bails only when something else genuinely owns the key: a text
     * field, a picker, the editor, or a scrollable region inside the page, each
     * of which keeps its own behavior. Returns whether it handled the keystroke.
     */
    function handleScrollKey(event: KeyboardEvent): boolean {
        if (main === undefined || !scroll) return false;
        // A modified key is someone else's shortcut, not a scroll.
        if (event.metaKey || event.ctrlKey || event.altKey) return false;
        if (event.defaultPrevented) return false;
        if (ownsScrollKeys(document.activeElement)) return false;
        // Nothing to scroll: leave the key alone rather than swallowing it.
        if (main.scrollHeight <= main.clientHeight) return false;
        const action = scrollKeyAction(
            event.key,
            event.shiftKey,
            main.clientHeight,
        );
        if (action === undefined) return false;
        // Accumulate against the position we're already heading toward, not the
        // live scrollTop — see nextScrollTarget for why a held key otherwise
        // barely moves. Animated, like the document scrolling this replaces:
        // paging that jumps loses the reader's place.
        const target = nextScrollTarget(
            scrollTarget ?? main.scrollTop,
            action,
            main.scrollHeight - main.clientHeight,
        );
        scrollTarget = target;
        scrollTowards(main, target);
        return true;
    }

    function handleKey(event: KeyboardEvent) {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Escape' &&
            page.route.id !== null
        ) {
            localeGoto('/');
        } else if (handleScrollKey(event)) event.preventDefault();
    }
</script>

<svelte:window onkeydown={handleKey} />

<div class="page">
    {#if localizing.on}
        <header transition:slide><Localizer /></header>
    {/if}
    <!-- The scroll target lasts only until this scroll settles, or until the
         reader scrolls by some other means — after that a key press should
         resume from where they actually are, not a stale target. -->
    <main
        bind:this={main}
        class:fixed={!scroll}
        onscroll={(e) => (scrollY = e.currentTarget.scrollTop)}
        onscrollend={handleScrollSettled}
        onwheel={forgetScrollTarget}
        onpointerdown={forgetScrollTarget}
    >
        {@render children()}
    </main>
    {#if showBackToTop}
        <div class="backtotop">
            <div class="backtotop-inner">
                <Button
                    tip={(l) => l.ui.widget.backtotop}
                    action={scrollToTop}
                    background="circular">⏶</Button
                >
            </div>
        </div>
    {/if}
    <footer
        class:fullscreen={$fullscreen.on}
        class:arriving={navPhase === 'in'}
        class:leaving={navPhase === 'out'}
    >
        <nav>
            {#snippet navHome()}
                {#if showNav}
                    <Link
                        nowrap
                        tab
                        graphic
                        tip={(l) => l.ui.widget.home}
                        ariaLabel={(l) => l.ui.widget.home}
                        to="/"
                        ><!-- The exemplar glyph of the viewer's primary
                             locale's script (Logo's default), at the nav's own
                             size rather than the 150% it used to be: in a tab
                             the prominence comes from the chrome, and a bigger
                             mark would make this tab taller than the rest. -->
                        <Logo /></Link
                    >
                {/if}
            {/snippet}
            {#snippet navSettings()}
                <Settings />
            {/snippet}
            {#snippet navProjects()}
                {#if showNav}
                    <Link
                        nowrap
                        tab
                        within={['/project']}
                        tip={(l) => l.ui.page.projects.header}
                        to="/projects"
                    >
                        <Emoji text={PROJECT_SYMBOL} /><span class="nav-label"
                            ><LocalizedText
                                path={(l) => l.ui.page.projects.header}
                            /></span
                        >
                    </Link>
                {/if}
            {/snippet}
            {#snippet navGalleries()}
                {#if showNav}
                    <Link
                        nowrap
                        tab
                        within={['/gallery']}
                        tip={(l) => l.ui.page.galleries.header}
                        to="/galleries"
                    >
                        <Emoji text={STAGE_SYMBOL} /><span class="nav-label"
                            ><LocalizedText
                                path={(l) => l.ui.page.galleries.header}
                            /></span
                        >
                    </Link>
                {/if}
            {/snippet}
            {#snippet navCharacters()}
                {#if showNav}
                    <Link
                        nowrap
                        tab
                        within={['/character']}
                        tip={(l) => l.ui.page.characters.header}
                        to="/characters"
                    >
                        <Emoji text={SYMBOL_SYMBOL} /><span class="nav-label"
                            ><LocalizedText
                                path={(l) => l.ui.page.characters.header}
                            /></span
                        >
                    </Link>
                {/if}
            {/snippet}
            {#snippet navLearn()}
                {#if showNav}
                    <Link
                        nowrap
                        tab
                        tip={(l) => l.ui.page.learn.header}
                        to="/learn"
                    >
                        <Emoji text={LEARN_SYMBOL} /><span class="nav-label"
                            ><LocalizedText
                                path={(l) => l.ui.page.learn.header}
                            /></span
                        >
                    </Link>
                {/if}
            {/snippet}
            {#snippet navGuide()}
                {#if showNav}
                    <Link
                        nowrap
                        tab
                        tip={(l) => l.ui.page.guide.header}
                        to="/guide"
                    >
                        <Emoji text={DOCUMENTATION_SYMBOL} /><span
                            class="nav-label"
                            ><LocalizedText
                                path={(l) => l.ui.page.guide.header}
                            /></span
                        >
                    </Link>
                {/if}
            {/snippet}
            {#snippet navTeach()}
                {#if showNav}
                    <Link
                        nowrap
                        tab
                        tip={(l) => l.ui.page.teach.header}
                        to="/teach"
                    >
                        <Emoji text={TEACH_SYMBOL} /><span class="nav-label"
                            ><LocalizedText
                                path={(l) => l.ui.page.teach.header}
                            /></span
                        >
                    </Link>
                {/if}
            {/snippet}
            {#snippet navLocalizationToggle()}
                {#if isAuthenticated($user)}
                    <Toggle
                        on={localizing.on}
                        tips={(l) => l.ui.localize.toggle.mode}
                        toggle={() => (localizing.on = !localizing.on)}
                        highlight={page.route.id?.endsWith('/localize') ===
                            true && !localizing.on}>✎</Toggle
                    >
                {/if}
            {/snippet}
            {#snippet navLocaleChooser()}
                <LocaleChooser />
            {/snippet}
            {#snippet navFeedback()}
                <Feedback />
            {/snippet}
            {#snippet navNotifications()}
                <Notifications />
            {/snippet}
            {#snippet navCreator()}
                <Link nowrap to="/login">
                    <CreatorView
                        anonymize={false}
                        creator={$user ? Creator.from($user) : null}
                        chrome={$user !== null}
                        loading={$user === undefined}
                        prompt
                    />
                </Link>
            {/snippet}
            {#snippet navStatus()}
                <Status />
            {/snippet}
            <OverflowToolbar
                pinnedStart={[
                    navHome,
                    navProjects,
                    navGalleries,
                    navCharacters,
                    navLearn,
                    navGuide,
                    navTeach,
                ]}
                items={[
                    navSettings,
                    navLocalizationToggle,
                    navLocaleChooser,
                    navFeedback,
                    navNotifications,
                    navCreator,
                ]}
                pinned={[navStatus]}
            />
        </nav>
    </footer>
</div>

<style>
    .page {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
    }

    main {
        display: flex;
        flex-direction: column;
        align-items: start;
        overflow: auto;
        /* Rubber-banding the content shouldn't chain out to the document. */
        overscroll-behavior: contain;
        flex: 1;
        min-height: 0;
    }

    /* Pages that manage their own layout at full size (ProjectView) must not sit
       in a scrollable box: a stray pixel of overflow lets a touch pan the whole
       page sideways, leaving a blank margin where the content used to be. */
    main.fixed {
        overflow: hidden;
    }

    main:focus {
        outline: none !important;
    }

    header,
    footer {
        width: 100%;
        max-width: 100%;
        overflow: auto;
        /* The rigid ends of the column: without this, `overflow: auto` zeroes their
           automatic minimum size and any height pressure squeezes them instead of
           the scrolling content between them. */
        flex-shrink: 0;
        z-index: 1;
        color: var(--wordplay-foreground);
        background: var(--wordplay-background);
    }

    footer {
        /* Container query context so the nav-label hiding rule below
           tracks the footer's actual width, not the viewport. */
        container-type: inline-size;
    }

    /* The arrival and departure described on `navPhase`. The tabs are fully
       opaque whenever they are settled — the ramp only runs while they are on
       their way in or out, and outside those few hundred milliseconds they are
       either solid or not rendered at all. */
    footer.arriving :global(.pinned-start) {
        animation: nav-arrive calc(var(--animation-factor) * 0.4s) ease-out;
    }

    footer.leaving :global(.pinned-start) {
        animation: nav-arrive calc(var(--animation-factor) * 0.4s) ease-in
            reverse forwards;
    }

    @keyframes nav-arrive {
        0% {
            transform: translateY(1em);
            opacity: 0;
        }
        100% {
            transform: translateY(0);
            opacity: 1;
        }
    }

    /* The link underline is drawn on the label, not on the anchor: a line
       running under an emoji reads as noise rather than as a link, and the
       footer's logo shouldn't carry one at all. Rest is the same 2px the
       global `a` rule reserves; hover and focus thicken it to the focus blue,
       exactly as they do for any other link in the app. */
    footer :global(.link.tab .nav-label) {
        text-decoration: calc(var(--wordplay-focus-width) / 2) underline
            var(--wordplay-link-color);
    }

    footer :global(a.link.tab:hover .nav-label),
    footer :global(a.link.tab:focus .nav-label) {
        text-decoration-thickness: var(--wordplay-focus-width);
        text-decoration-color: var(--wordplay-focus-color);
    }

    /* The section's own landing page isn't a link. */
    footer :global(.link.tab.current.inactive .nav-label) {
        text-decoration: none;
    }

    /* Small gap between each link's emoji icon and its text label.
       Because it lives on the label and not the parent, when the label
       collapses to `display: none` below the container-query threshold,
       the gap vanishes with it. */
    footer :global(.nav-label) {
        margin-inline-start: var(--wordplay-spacing-half);
    }

    /* Below the threshold, collapse each nav link to its emoji icon only
       so the hamburger toggle stays visible on narrow screens. The
       Link's `tip` provides the accessible name when the visible text
       label is hidden. */
    @container (max-width: 800px) {
        footer :global(.nav-label) {
            display: none;
        }

        /* Icon-only tabs give up their inline padding, not their spacing: the
           24px minimum below is target enough, which lands the row at roughly
           the width the bare links occupied before #836. */
        footer :global(.link.tab) {
            padding-inline: 0;
        }

        /* With the labels hidden there is no text to underline, so hover and
           focus become the same bar the logo uses year-round. */
        footer :global(a.link.tab:hover),
        footer :global(a.link.tab:focus) {
            box-shadow: inset 0 calc(-1 * var(--wordplay-focus-width)) 0
                var(--wordplay-focus-color);
        }
    }

    header {
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        padding: var(--wordplay-spacing);

        background-color: var(--wordplay-background);
        background-image:
            linear-gradient(
                135deg,
                var(--wordplay-alternating-color) 25%,
                transparent 25%
            ),
            linear-gradient(
                225deg,
                var(--wordplay-alternating-color) 25%,
                transparent 25%
            ),
            linear-gradient(
                45deg,
                var(--wordplay-alternating-color) 25%,
                transparent 25%
            ),
            linear-gradient(
                315deg,
                var(--wordplay-alternating-color) 25%,
                var(--wordplay-background) 25%
            );
        background-position:
            10px 0,
            10px 0,
            0 0,
            0 0;
        background-size: 20px 20px;
        background-repeat: repeat;
    }

    /* The rule the nav's tabs attach to. It sits on the nav rather than on the
       footer because the footer's `overflow: auto` clips its descendants at the
       padding box — inside the border — which shaved off exactly the 1px the
       current page's tab overhangs, leaving the rule drawn straight across its
       top. Inside the clip, the tab's own background covers that segment and
       the tab merges with the page above it. */
    footer nav {
        border-block-start: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    nav {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        padding: var(--wordplay-spacing-half);
        gap: var(--wordplay-spacing);
    }

    /* Cancel Link's default align-self: flex-start (used in flex columns
       like Profile's <Action>) so inactive links in this row-direction nav
       line up vertically with active links (which render as raw text and
       follow `align-items: center`). Without this, inactive <a class="link">
       items pin to the top of the row while raw-text active items stay
       centered, producing an obvious vertical mismatch when the row is
       taller than a single line (the LOGO emoji at 150% font-size makes it
       tall here). */
    nav :global(.link:not(.tab)) {
        align-self: center;
    }

    /* Tabs stretch instead, to a common height (see Link's .tab). This rule
       would otherwise outrank the variant's own align-self. The row runs to
       the footer's top border so the current page's tab can overhang it, and
       carries Tabbed's own inter-tab gap. */
    footer :global(.pinned-start) {
        align-self: stretch;
        align-items: stretch;
        gap: var(--wordplay-spacing-half);
        /* Only the tab row gives up the nav's top padding, by pulling up
           through it to the rule it merges with. Zeroing the padding instead
           made every other control in the row sit high, since they're centered
           in what was then an asymmetric box. */
        margin-block-start: calc(-1 * var(--wordplay-spacing-half));
    }

    /* The toolbar has to be the nav's full height for the tab row to stretch
       to it. */
    footer nav > :global(.overflow-toolbar) {
        align-self: stretch;
    }

    /* Settings.svelte uses margin-inline-start:auto to push itself to the
       end of its flex row. Inside the OverflowToolbar's `pinned` wrapper
       it's a single-child inline-flex, so the auto margin has no effect
       anyway — but it can affect the natural-width measurement done by
       the toolbar. Cancel it; the pinned slot handles anchoring instead. */
    nav :global(.settings) {
        margin-inline-start: 0;
    }

    /* Anchor sits in the flex flow just above the footer with no height of
       its own, so the absolutely-positioned inner bar rests on top of the
       footer (anchor's bottom edge == footer's top edge) without pushing
       layout. The high z-index keeps the button above the footer, which
       has z-index: 1. */
    .backtotop {
        position: relative;
        height: 0;
        z-index: 2;
    }

    /* Pinned to the inline end (right in LTR, left in RTL) just above the
       footer. Padding from both the edge and the footer matches the standard
       page spacing. */
    .backtotop-inner {
        position: absolute;
        bottom: var(--wordplay-spacing);
        inset-inline-end: var(--wordplay-spacing);
    }
</style>
