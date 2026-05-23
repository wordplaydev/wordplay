<script lang="ts">
    import { page } from '$app/state';
    import Emoji from '@components/app/Emoji.svelte';
    import Link from '@components/app/Link.svelte';
    import Localizer from '@components/localization/Localizer.svelte';
    import {
        getLocalizing,
        setFullscreen,
        type FullscreenContext,
    } from '@components/project/Contexts';
    import Settings from '@components/settings/Settings.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Color from '@output/Color';
    import { LOGO_SYMBOL } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';
    import { onMount, type Snippet } from 'svelte';
    import { writable } from 'svelte/store';
    import { slide } from 'svelte/transition';

    interface Props {
        children: Snippet;
        footer?: boolean;
    }

    let { children, footer = true }: Props = $props();

    let scrollY = $state(0);
    let showBackToTop = $derived(
        typeof window !== 'undefined' && scrollY > window.innerHeight,
    );
    let scrollContainer: HTMLElement | null = null;

    function scrollToTop() {
        scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    onMount(() => {
        scrollContainer = document.querySelector('main');
        if (scrollContainer) {
            const handler = () => {
                scrollY = scrollContainer!.scrollTop;
            };
            scrollContainer.addEventListener('scroll', handler);
            return () =>
                scrollContainer!.removeEventListener('scroll', handler);
        }
    });

    // Set a fullscreen flag to indicate whether footer should hide or not.
    // It's the responsibility of children componets to set this based on their state.
    // It's primarily ProjectView that does this.
    let fullscreen: FullscreenContext = writable({
        on: false,
        background: null,
    });
    setFullscreen(fullscreen);

    let localizing = getLocalizing();

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
    <main>
        {@render children()}
    </main>
    {#if showBackToTop && page.route.id !== '/[[locale]]'}
        <div class="backtotop">
            <div class="backtotop-inner">
                <Button
                    tip={(l) => l.ui.widget.backtotop}
                    action={scrollToTop}
                    background>⏶</Button
                >
            </div>
        </div>
    {/if}
    <footer class:fullscreen={$fullscreen.on}>
        <nav>
            {#if footer}
                <Link nowrap tip={(l) => l.ui.widget.home} to="/"
                    ><Emoji
                        ><span style:font-size="150%">{LOGO_SYMBOL}</span
                        ></Emoji
                    ></Link
                >
                <Link nowrap to="/projects"
                    ><LocalizedText
                        path={(l) => l.ui.page.projects.header}
                    /></Link
                >
                <Link nowrap to="/galleries"
                    ><LocalizedText
                        path={(l) => l.ui.page.galleries.header}
                    /></Link
                >
                <Link nowrap to="/characters"
                    ><LocalizedText
                        path={(l) => l.ui.page.characters.header}
                    /></Link
                >
                <Link nowrap to="/learn"
                    ><LocalizedText
                        path={(l) => l.ui.page.learn.header}
                    /></Link
                >
                <Link nowrap to="/guide"
                    ><LocalizedText
                        path={(l) => l.ui.page.guide.header}
                    /></Link
                >
                <Link nowrap to="/teach"
                    ><LocalizedText
                        path={(l) => l.ui.page.teach.header}
                    /></Link
                >
                <Link nowrap external to="https://discord.gg/Jh2Qq9husy"
                    ><LocalizedText path={(l) => l.term.help} /></Link
                >
            {/if}
            <Settings />
        </nav>
    </footer>
</div>

<style>
    .page {
        width: 100dvw;
        height: calc(100dvh - 1px);
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
        border-top-left-radius: var(--wordplay-border-radius);
        border-top-right-radius: var(--wordplay-border-radius);
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

    /* Full-width flex bar so the button is centered by its parent rather
       than by its own transform — Button applies a hover/focus translate
       that would otherwise fight a translateX(-50%) centering. */
    .backtotop-inner {
        position: absolute;
        bottom: var(--wordplay-spacing);
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        pointer-events: none;
    }

    .backtotop-inner :global(button) {
        pointer-events: auto;
    }
</style>
