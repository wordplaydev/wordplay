<script lang="ts">
    import Action from '@components/app/Action.svelte';
    import BigLink from '@components/app/BigLink.svelte';
    import LandingStage from '@components/app/LandingStage.svelte';
    import { getLogoLanguageCycle } from '@components/app/logoGlyph';
    import Page from '@components/app/Page.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import { LocaleDialogID } from '@components/widgets/dialogIDs';
    import { setDialogInURL } from '@components/widgets/dialogURL';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { animationFactor, DB, Settings } from '@db/Database';
    import { getLocaleLanguageName } from '@locale/LocaleText';
    import { SupportedLocales } from '@locale/SupportedLocales';
    import {
        COLLABORATE_SYMBOL,
        DOCUMENTATION_SYMBOL,
        LEARN_SYMBOL,
        PROJECT_SYMBOL,
        STAGE_SYMBOL,
        SYMBOL_SYMBOL,
        TEACH_SYMBOL,
        VIEW_SYMBOL,
    } from '@parser/Symbols';
    import Characters from '../../lore/BasisCharacters';
    import { Emotion } from '../../lore/Emotion';
    import Beta from './Beta.svelte';
    import FeatureSection from './FeatureSection.svelte';
    import Iconified from './Iconified.svelte';
    import date from './updates/date.json';

    const user = getUser();

    // The language chooser's rotating label and the logo's glyph advance in
    // lockstep — the language drives the script. The cycle is the union of
    // both lists: every supported locale paired with its script's glyph,
    // then a few glyph-only emoji entries, during which the label holds.
    const cycle = getLogoLanguageCycle();
    let index = $state(0);
    let isHovering = $state(false);

    const cycleGlyph = $derived(cycle[index % cycle.length].glyph);
    const rotatingLocale = $derived.by(() => {
        // The current entry's locale, or — during glyph-only entries — the
        // most recent one before it, so the chooser always names a language.
        for (let back = 0; back < cycle.length; back++) {
            const entry =
                cycle[(index - back + cycle.length * 2) % cycle.length];
            if (entry.locale !== undefined) return entry.locale;
        }
        return SupportedLocales[0];
    });
    const rotatingLabel = $derived(getLocaleLanguageName(rotatingLocale));

    $effect(() => {
        // Paused while pointed at; no timer at all at factor 0 (reduced
        // motion), matching the JS-motion convention in StageCast.svelte.
        // Larger factors slow the cycle like every other duration, floored
        // so the label always stays readable.
        if (isHovering || $animationFactor <= 0) return;
        const period = Math.max(1500, 4000 * $animationFactor);
        let alive = true;
        let cycler: ReturnType<typeof setInterval> | null = null;
        // Wait for fonts so the first glyph swaps aren't seen mid-FOUT.
        document.fonts.ready.then(() => {
            if (!alive) return;
            cycler = setInterval(
                () => (index = (index + 1) % cycle.length),
                period,
            );
        });
        return () => {
            alive = false;
            if (cycler) clearInterval(cycler);
        };
    });

    /** Open the footer's language chooser rather than mounting a second one here: two
     *  dialogs sharing an id both match `?dialog=locale` and both open, stacking one
     *  modal on top of another. */
    function openLocaleMenu() {
        setDialogInURL(LocaleDialogID, true);
    }

    function switchToCurrentLocale() {
        DB.Locales.setLocales([rotatingLocale]);
    }

    let updatesLastChecked = $derived(Settings.getUpdatesLastChecked());

    /**
     * The big route links, watched so the footer's tabs appear exactly when
     * these leave — the same destinations, moving to the place they live on
     * every other page.
     *
     * Hidden means *not rendered*, rather than rendered-but-dimmed: a focusable
     * link nobody can see is worse than one that isn't there, and dimming real
     * link text drops it below its contrast ratio. Nothing is unreachable in
     * the meantime, because the big links carrying the same destinations are on
     * screen for exactly as long as the tabs are not.
     */
    let links: HTMLElement | undefined = $state();
    let linksAway = $state(false);

    /** How far the stage's handover to the examples has got. */
    let tour: 'idle' | 'leaving' | 'showing' = $state('idle');

    $effect(() => {
        if (links === undefined || typeof IntersectionObserver === 'undefined')
            return;
        const observer = new IntersectionObserver(
            ([entry]) => (linksAway = !entry.isIntersecting),
            { threshold: 0 },
        );
        observer.observe(links);
        return () => observer.disconnect();
    });

    /** The feature list, in the order it appears. Emoji are hard-coded rather
     *  than localized: they're pictures, not words. */
    const Features = [
        { icon: '</>', key: 'language' },
        { icon: '🌐', key: 'multilingual' },
        { icon: '♿', key: 'accessible' },
        { icon: VIEW_SYMBOL, key: 'senses' },
        { icon: STAGE_SYMBOL, key: 'performs' },
        { icon: '🎨', key: 'typography' },
        { icon: DOCUMENTATION_SYMBOL, key: 'docs' },
        { icon: COLLABORATE_SYMBOL, key: 'sharing' },
        { icon: '💛', key: 'free' },
    ] as const;
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Page footer={linksAway}>
    <div class="landing">
        <!-- First thing on the page, and held to a readable measure: it's a
             paragraph to be read, not a banner to be scanned past. -->
        <div class="beta"><Beta /></div>
        <!-- The stage and the call to action stay put while the links pass
             beneath them, then scroll away when the feature list begins —
             which is where `.top` ends. -->
        <div class="top">
            <div class="hero">
                <LandingStage glyph={cycleGlyph} bind:phase={tour} />
                <!-- The invitation to get started is worth the room until the
                     visitor takes it. Once the examples are up they are the
                     thing to look at, and a speech bubble under them is just
                     something between them and the page. -->
                {#if tour !== 'showing'}
                    <div class="welcome" class:leaving={tour === 'leaving'}>
                        <Speech
                            character={Characters.FunctionDefinition}
                            emotion={Emotion.happy}
                            big
                            >{#snippet content()}
                                <MarkupHTMLView
                                    markup={(l) => l.ui.page.landing.value}
                                    inline
                                />
                                <!-- The hover/focus handlers only pause the rotating
                                 locale label while it's pointed at or focused; the
                                 Button inside is the interactive element. -->
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <span
                                    class="locale-button-wrapper"
                                    onmouseenter={() => (isHovering = true)}
                                    onmouseleave={() => (isHovering = false)}
                                    onfocusin={() => (isHovering = true)}
                                    onfocusout={() => (isHovering = false)}
                                >
                                    {#key rotatingLabel}
                                        <Button
                                            tip={(l) =>
                                                l.ui.dialog.locale.button
                                                    .replace}
                                            action={switchToCurrentLocale}
                                            background
                                            classes="locale-picker"
                                        >
                                            <span class="locale-word"
                                                >{rotatingLabel}</span
                                            >
                                        </Button>
                                    {/key}
                                </span>
                                <LocalizedText
                                    path={(l) =>
                                        l.ui.page.landing.chooseLocales}
                                />
                                <Button
                                    tip={(l) => l.ui.dialog.locale.button.show}
                                    action={openLocaleMenu}
                                    background
                                    classes="locale-picker"
                                    label={(l) =>
                                        l.ui.dialog.locale.button.menu}
                                ></Button>.
                            {/snippet}
                        </Speech>
                    </div>
                {/if}
            </div>

            <div class="links" bind:this={links}>
                {#if $user === null}
                    <BigLink
                        to="/login"
                        subtitle={(l) => l.ui.page.login.subtitle}
                        ><LocalizedText
                            path={(l) => l.ui.page.login.header}
                        /></BigLink
                    >
                {/if}
                <div class="actions">
                    <Action>
                        <BigLink
                            to="/projects"
                            smaller
                            subtitle={(l) => l.ui.page.landing.link.projects}
                            ><Iconified
                                icon={PROJECT_SYMBOL}
                                text={(l) => l.ui.page.projects.header}
                            /></BigLink
                        >
                    </Action>
                    <Action>
                        <BigLink
                            smaller
                            to="/galleries"
                            subtitle={(l) => l.ui.page.landing.link.galleries}
                            ><Iconified
                                icon={STAGE_SYMBOL}
                                text={(l) => l.ui.page.galleries.header}
                            /></BigLink
                        >
                    </Action>
                    <Action>
                        <BigLink
                            smaller
                            to="/characters"
                            subtitle={(l) => l.ui.page.landing.link.characters}
                            ><Iconified
                                icon={SYMBOL_SYMBOL}
                                text={(l) => l.ui.page.characters.header}
                            /></BigLink
                        >
                    </Action>
                    <Action>
                        <BigLink
                            smaller
                            to="/learn"
                            subtitle={(l) => l.ui.page.landing.link.learn}
                            ><Iconified
                                icon={LEARN_SYMBOL}
                                text={(l) => l.ui.page.learn.header}
                            /></BigLink
                        >
                    </Action>
                    <Action>
                        <BigLink
                            to="/guide"
                            smaller
                            subtitle={(l) => l.ui.page.landing.link.guide}
                            ><Iconified
                                icon={DOCUMENTATION_SYMBOL}
                                text={(l) => l.ui.page.guide.header}
                            /></BigLink
                        >
                    </Action>
                    <Action>
                        <BigLink
                            smaller
                            to="/teach"
                            subtitle={(l) => l.ui.page.landing.link.teach}
                            ><Iconified
                                icon={TEACH_SYMBOL}
                                text={(l) => l.ui.page.teach.header}
                            /></BigLink
                        >
                    </Action>
                </div>
            </div>
        </div>

        <div class="features">
            {#each Features as feature (feature.key)}
                <FeatureSection
                    icon={feature.icon}
                    title={(l) => l.ui.page.landing.features[feature.key].title}
                    bullets={(l) =>
                        l.ui.page.landing.features[feature.key].bullets}
                />
            {/each}
        </div>

        <div class="actions about">
            <Action
                kind={updatesLastChecked === null ||
                updatesLastChecked !== date.date
                    ? 'salient'
                    : 'meta'}
            >
                <BigLink
                    smaller
                    to="/updates"
                    subtitle={(l) => l.ui.page.landing.link.updates}
                >
                    <Iconified
                        icon="🎉"
                        text={(l) => l.ui.page.updates.header}
                    />
                </BigLink>
            </Action>
            <Action kind="meta">
                <BigLink
                    smaller
                    to="/about"
                    subtitle={(l) => l.ui.page.landing.link.about}
                    ><Iconified
                        icon="💭"
                        text={(l) => l.ui.page.about.header}
                    /></BigLink
                >
            </Action>
            <Action kind="meta">
                <BigLink
                    smaller
                    to="/thanks"
                    subtitle={(l) => l.ui.page.landing.link.thanks}
                    ><Iconified
                        icon="🙏"
                        text={(l) => l.ui.page.thanks.header}
                    /></BigLink
                >
            </Action>
            <Action kind="meta">
                <BigLink
                    smaller
                    to="/rights"
                    subtitle={(l) => l.ui.page.landing.link.rights}
                    ><Iconified
                        icon="⚖️"
                        text={(l) => l.ui.page.rights.header}
                    /></BigLink
                ></Action
            >
            <Action kind="meta">
                <BigLink
                    smaller
                    external
                    to="https://discord.gg/Jh2Qq9husy"
                    subtitle={(l) => l.ui.page.landing.link.community.subtitle}
                    ><Iconified
                        icon="🗣️"
                        text={(l) => l.ui.page.landing.link.community.label}
                    /></BigLink
                ></Action
            >
            <Action kind="meta">
                <BigLink
                    smaller
                    external
                    to="https://github.com/wordplaydev/wordplay/wiki/contribute"
                    subtitle={(l) => l.ui.page.landing.link.contribute.subtitle}
                    ><Iconified
                        icon="🛠️"
                        text={(l) => l.ui.page.landing.link.contribute.label}
                    />
                </BigLink>
            </Action>
            <Action kind="meta">
                <BigLink
                    smaller
                    to="/design"
                    subtitle={(l) => l.ui.page.landing.link.design}
                    ><Iconified
                        icon="🎨"
                        text={(l) => l.ui.page.design.header}
                    />
                </BigLink>
            </Action>
            <Action kind="meta">
                <BigLink
                    smaller
                    to="/localize"
                    subtitle={(l) => l.ui.page.landing.link.localize}
                    ><Iconified
                        icon="✎"
                        text={(l) => l.ui.page.localize.header}
                    />
                </BigLink>
            </Action>
            <Action kind="meta">
                <BigLink
                    smaller
                    to="/donate"
                    subtitle={(l) => l.ui.page.donate.prompt}
                >
                    <Iconified
                        icon="🤑"
                        text={(l) => l.ui.page.donate.header}
                    />
                </BigLink>
            </Action>
        </div>
    </div>
</Page>

<style>
    /* The page's own container, so every breakpoint below is a container query
       against the page's width — the convention the footer and project chrome
       already follow — rather than a media query. */
    .landing {
        container-type: inline-size;
        width: 100%;
        padding-inline: calc(var(--wordplay-spacing) * 2);
        padding-block-end: calc(var(--wordplay-spacing) * 4);
        box-sizing: border-box;
    }

    .hero {
        position: sticky;
        top: 0;
        z-index: 2;
        /* Opaque, so the links passing beneath don't show through it. */
        background: var(--wordplay-background);
        display: flex;
        flex-direction: column;
        /* The stage and the call to action are two things, not one: without
           room between them the examples ran straight into the speech bubble. */
        gap: calc(var(--wordplay-spacing) * 2);
        padding-block-end: calc(var(--wordplay-spacing) * 2);
    }

    /* One measure for every band of content, so their edges line up down the
       page instead of each block finding its own width. The stage is the only
       thing that opts out — it is a picture, not a column of text. */
    .landing {
        --measure: 60em;
    }

    .beta,
    .welcome {
        max-width: var(--measure);
        margin-inline: auto;
    }

    .beta {
        /* Room above it: flush against the top edge it read as a browser
           chrome bar rather than something on the page. */
        padding-block-start: calc(var(--wordplay-spacing) * 3);
        padding-block-end: calc(var(--wordplay-spacing) * 2);
    }

    /* Leaves on the same ramp the lockup and its cast leave on, so the whole
       stage hands over at once instead of the bubble snapping out from under
       the fade. Matches LandingStage's own curtain duration. */
    .welcome.leaving {
        opacity: 0;
    }

    .welcome {
        transition: opacity calc(var(--animation-factor) * 0.4s) ease-out;
        display: flex;
        flex-direction: row;
        line-height: 1.8;
        /* The bubble takes the content column, so its inline start lines up
           with the links and the claims below it, and the character doing the
           speaking hangs in the margin beside it. Centering it instead left the
           bubble's edge at a width nothing else shared. */
        position: relative;
    }

    .welcome :global(.dialog) {
        width: 100%;
    }

    .welcome :global(.message) {
        flex: 1;
        min-width: 0;
    }

    .welcome :global(.speaker) {
        position: absolute;
        inset-inline-end: 100%;
        margin-inline-end: var(--wordplay-spacing);
    }

    .links {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding-block: calc(var(--wordplay-spacing) * 2);
    }

    .locale-word {
        display: inline-block;
        /* Factor-scaled so reduced motion (factor 0) swaps without animating,
           matching Spinning.svelte. */
        animation: slideBounce calc(var(--animation-factor) * 0.5s)
            cubic-bezier(0.25, 1.2, 0.5, 1) forwards;
    }

    @keyframes slideBounce {
        0% {
            transform: translateY(-80%);
            opacity: 0;
        }
        50% {
            transform: translateY(5%);
            opacity: 1;
        }
        70% {
            transform: translateY(-2%);
        }
        85% {
            transform: translateY(1%);
        }
        100% {
            transform: translateY(0);
        }
    }

    /* The route links spread across the page rather than sitting in a fixed
       column, fitting as many as the width allows instead of a hard three —
       on a wide screen three made each one enormous with room for a fourth.
       The measure caps it at four; below that `auto-fit` steps down on its own,
       so no breakpoint has to name a column count. */
    /* Both link grids — the section links and the meta links below the feature
       list — step through the same column counts at the same widths. They are
       the same kind of thing, and having them reflow at different points made
       the page look like two designs. Two columns is the floor: a pair of these
       fits a phone comfortably, and one per row wasted most of the width. */
    .actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--wordplay-spacing);
        align-items: stretch;
        max-width: var(--measure);
        margin-inline: auto;
    }

    .actions.about {
        margin-top: calc(var(--wordplay-spacing) * 2);
    }

    /* Each section keeps a readable measure of its own (44em, set on the
       section), so the page fits as many per row as it has width for rather
       than stretching one column across a very wide screen. `start` rather than
       `stretch` so a short section doesn't inflate to its neighbor's height. */
    .features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 26em), 1fr));
        align-items: start;
        gap: 0 calc(var(--wordplay-spacing) * 3);
        max-width: var(--measure);
        margin-inline: auto;
    }

    .actions :global(.action) {
        min-width: 0;
        width: auto;
    }

    .actions.about :global(.biglink.smaller .link) {
        font-size: min(19.2pt, max(11.2pt, 2.4vw));
    }

    .actions.about :global(.biglink .subtitle) {
        font-size: calc(var(--wordplay-font-size) * 0.8);
    }

    @container (min-width: 700px) {
        .actions {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @container (max-width: 700px) {
        /* A stage pinned to the top of a short screen leaves nothing for the
           content it's pinned over, so on phones everything simply scrolls. */
        .hero {
            position: static;
        }

        /* No margin to hang in: the speaker comes back inside the column. */
        .welcome :global(.speaker) {
            position: static;
            margin-inline-end: 0;
        }

        .welcome {
            gap: var(--wordplay-spacing);
        }

        .landing {
            padding-inline: var(--wordplay-spacing);
        }
    }
</style>
