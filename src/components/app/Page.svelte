<script lang="ts">
    import { page } from '$app/state';
    import CreatorView from '@components/app/CreatorView.svelte';
    import Emoji from '@components/app/Emoji.svelte';
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
    import Color from '@output/Color';
    import {
        DOCUMENTATION_SYMBOL,
        LEARN_SYMBOL,
        LOGO_SYMBOL,
        PROJECT_SYMBOL,
        STAGE_SYMBOL,
        SYMBOL_SYMBOL,
        TEACH_SYMBOL,
    } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';
    import { type Snippet } from 'svelte';
    import { writable } from 'svelte/store';
    import { slide } from 'svelte/transition';

    interface Props {
        children: Snippet;
        footer?: boolean;
    }

    let { children, footer = true }: Props = $props();

    let main: HTMLElement | undefined = $state();
    let scrollY = $state(0);
    let showBackToTop = $derived(scrollY > 200);

    function scrollToTop() {
        main?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Set a fullscreen flag to indicate whether footer should hide or not.
    // It's the responsibility of children componets to set this based on their state.
    // It's primarily ProjectView that does this.
    let fullscreen: FullscreenContext = writable({
        on: false,
        background: null,
    });
    setFullscreen(fullscreen);

    const localizing = getLocalizing();
    const user = getUser();

    $effect(() => {
        if (typeof document !== 'undefined' && $fullscreen) {
            document.body.style.background = $fullscreen.on
                ? $fullscreen.background instanceof Color
                    ? $fullscreen.background.toCSS()
                    : ($fullscreen.background ?? '')
                : '';
            document.body.style.color = $fullscreen.on
                ? $fullscreen.background instanceof Color
                    ? $fullscreen.background.contrasting().toCSS()
                    : ''
                : '';
        }
    });

    function handleKey(event: KeyboardEvent) {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Escape' &&
            page.route.id !== null
        ) {
            localeGoto('/');
        }
    }
</script>

<svelte:window onkeydown={handleKey} />

<div class="page">
    {#if localizing.on}
        <header transition:slide><Localizer /></header>
    {/if}
    <main
        bind:this={main}
        onscroll={(e) => (scrollY = e.currentTarget.scrollTop)}
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
    <footer class:fullscreen={$fullscreen.on}>
        <nav>
            {#snippet navHome()}
                {#if footer}
                    <Link nowrap tip={(l) => l.ui.widget.home} to="/"
                        ><span style:font-size="150%"
                            ><Emoji text={LOGO_SYMBOL} /></span
                        ></Link
                    >
                {/if}
            {/snippet}
            {#snippet navSettings()}
                <Settings />
            {/snippet}
            {#snippet navProjects()}
                {#if footer}
                    <Link
                        nowrap
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
                {#if footer}
                    <Link
                        nowrap
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
                {#if footer}
                    <Link
                        nowrap
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
                {#if footer}
                    <Link
                        nowrap
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
                {#if footer}
                    <Link
                        nowrap
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
                {#if footer}
                    <Link
                        nowrap
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
                        >✎</Toggle
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
        width: 100dvw;
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
        flex: 1;
        min-height: 0;
    }

    main:focus {
        outline: none !important;
    }

    header,
    footer {
        width: 100%;
        max-width: 100%;
        overflow: auto;
        z-index: 1;
        color: var(--wordplay-foreground);
        background: var(--wordplay-background);
    }

    footer {
        /* Container query context so the nav-label hiding rule below
           tracks the footer's actual width, not the viewport. */
        container-type: inline-size;
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

    footer {
        border-top: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
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
    nav :global(.link) {
        align-self: center;
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
