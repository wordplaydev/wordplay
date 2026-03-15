<script lang="ts">
    import Action from '@components/app/Action.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import Header from '@components/app/Header.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import {
        DOCUMENTATION_SYMBOL,
        EDIT_SYMBOL,
        LEARN_SYMBOL,
        LOGO_SYMBOL,
        STAGE_SYMBOL,
        SYMBOL_SYMBOL,
        TEACH_SYMBOL,
    } from '@parser/Symbols';
    import Background from '../components/app/Background.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import Writing from '../components/app/Writing.svelte';
    import MarkupHTMLView from '../components/concepts/MarkupHTMLView.svelte';
    import LocaleChooser from '../components/settings/LocaleChooser.svelte';
    import { DB, Settings } from '../db/Database';
    import { getLocaleLanguageName } from '../locale/LocaleText';
    import { SupportedLocales } from '../locale/SupportedLocales';
    import Characters from '../lore/BasisCharacters';
    import Emotion from '../lore/Emotion';
    import Beta from './Beta.svelte';
    import Iconified from './Iconified.svelte';
    import date from './updates/date.json';

    const user = getUser();

    let index = $state(0);
    let interval: ReturnType<typeof setInterval> | null = null;
    let isHovering = $state(false);

    const rotatingLocale = $derived(SupportedLocales[index]);
    const rotatingLabel = $derived(getLocaleLanguageName(rotatingLocale));

    function startRotation() {
        if (interval || isHovering) return;
        interval = setInterval(() => {
            index = (index + 1) % SupportedLocales.length;
        }, 4000);
    }

    function stopRotation() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    }

    $effect(() => {
        if (isHovering) {
            stopRotation();
            return;
        }
        startRotation();
    });

    let showLocaleChooser = $state(false);
    function openLocaleMenu() {
        showLocaleChooser = true;
    }

    function switchToCurrentLocale() {
        DB.Locales.setLocales([rotatingLocale]);
    }

    let updatesLastChecked = $derived(Settings.getUpdatesLastChecked());
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Writing footer={false}>
    <Beta />
    <Header
        ><Emoji>{LOGO_SYMBOL}</Emoji><LocalizedText
            path={(l) => l.wordplay}
        /></Header
    >
    <div class="welcome">
        <div style:margin-inline-start="-2.5em">
            <Speech
                character={Characters.FunctionDefinition}
                emotion={Emotion.happy}
                big
                >{#snippet content()}
                    <MarkupHTMLView
                        markup={(l) => l.ui.page.landing.value}
                        inline
                    />
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
                                tip={(l) => l.ui.dialog.locale.button.replace}
                                action={switchToCurrentLocale}
                                background
                                classes="locale-picker"
                            >
                                <span class="locale-word">{rotatingLabel}</span>
                            </Button>
                        {/key}
                    </span>
                    <LocalizedText
                        path={(l) => l.ui.page.landing.chooseLocales}
                    />
                    <Button
                        tip={(l) => l.ui.dialog.locale.button.show}
                        action={openLocaleMenu}
                        background
                        classes="locale-picker"
                        label={(l) => l.ui.dialog.locale.button.menu}
                    ></Button>.
                {/snippet}
            </Speech>
        </div>
    </div>

    <LocaleChooser bind:show={showLocaleChooser} showButton={false} />

    <MarkupHTMLView markup={(l) => l.ui.page.landing.description} />
    {#if $user === null}
        <br />
        <BigLink to="/login" subtitle={(l) => l.ui.page.login.subtitle}
            ><LocalizedText path={(l) => l.ui.page.login.header} /></BigLink
        >
    {/if}

    <br />

    <div class="actions">
        <Action>
            <BigLink
                to="/projects"
                smaller
                subtitle={(l) => l.ui.page.landing.link.projects}
                ><Iconified
                    icon={EDIT_SYMBOL}
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
                <Iconified icon="🎉" text={(l) => l.ui.page.updates.header} />
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
                to="/donate"
                subtitle={(l) => l.ui.page.donate.prompt}
            >
                <Iconified icon="🤑" text={(l) => l.ui.page.donate.header} />
            </BigLink>
        </Action>
    </div>
</Writing>

<style>
    .welcome {
        display: flex;
        flex-direction: row;
        gap: calc(var(--wordplay-spacing) * 2);
        margin-top: 2em;
        margin-bottom: 2em;
        max-width: 100%;
        line-height: 1.8;
    }

    .locale-word {
        display: inline-block;
        animation: slideBounce 0.5s cubic-bezier(0.25, 1.2, 0.5, 1) forwards;
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

    .actions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: stretch;
    }
</style>
