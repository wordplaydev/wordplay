<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import Background from '../components/app/Background.svelte';
    import { locales } from '../db/Database';
    import Writing from '../components/app/Writing.svelte';
    import MarkupHtmlView from '../components/concepts/MarkupHTMLView.svelte';
    import Lead from '@components/app/Lead.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import Action from '@components/app/Action.svelte';
    import {
        DOCUMENTATION_SYMBOL,
        EDIT_SYMBOL,
        STAGE_SYMBOL,
    } from '@parser/Symbols';
    import Beta from './Beta.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import Glyphs from '../lore/Glyphs';
    import Emotion from '../lore/Emotion';
    import Iconified from './Iconified.svelte';
    import { getUser } from '@components/project/Contexts';

    const user = getUser();
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Writing home>
    <Beta />
    <Header><Emoji>💬</Emoji>{$locales.get((l) => l.wordplay)}</Header>
    <Lead></Lead>
    <div class="welcome">
        <div style:margin-inline-start="-2.5em">
            <Speech glyph={Glyphs.Function} emotion={Emotion.happy} big
                ><svelte:fragment slot="content"
                    ><MarkupHtmlView
                        markup={$locales.get((l) => l.ui.page.landing.value)}
                    /></svelte:fragment
                ></Speech
            >
        </div>
    </div>
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.landing.description)}
    />
    {#if $user === null}
        <br />
        <BigLink
            to="/login"
            subtitle={$locales.get((l) => l.ui.page.login.subtitle)}
            >{$locales.get((l) => l.ui.page.login.header)}</BigLink
        >
    {/if}
    <br />
    <div class="actions">
        <Action>
            <BigLink
                to="/projects"
                smaller
                subtitle={$locales.get((l) => l.ui.page.landing.link.projects)}
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
                subtitle={$locales.get((l) => l.ui.page.landing.link.galleries)}
                ><Iconified
                    icon={STAGE_SYMBOL}
                    text={(l) => l.ui.page.galleries.header}
                /></BigLink
            >
        </Action>
        <Action>
            <BigLink
                smaller
                to="/learn"
                subtitle={$locales.get((l) => l.ui.page.landing.link.learn)}
                ><Iconified
                    icon="🙋‍♀️"
                    text={(l) => l.ui.page.learn.header}
                /></BigLink
            >
        </Action>
        <Action>
            <BigLink
                to="/guide"
                smaller
                subtitle={$locales.get((l) => l.ui.page.landing.link.guide)}
                ><Iconified
                    icon={DOCUMENTATION_SYMBOL}
                    text={(l) => l.ui.page.guide.header}
                /></BigLink
            >
        </Action>
    </div>
    <div class="details" slot="footer">
        <div class="links">
            <div class="column">
                <BigLink
                    smaller
                    to="/about"
                    subtitle={$locales.get((l) => l.ui.page.landing.link.about)}
                    ><Iconified
                        icon="💭"
                        text={(l) => l.ui.page.about.header}
                    /></BigLink
                >
                <BigLink
                    smaller
                    to="/rights"
                    subtitle={$locales.get(
                        (l) => l.ui.page.landing.link.rights,
                    )}
                    ><Iconified
                        icon="⚖️"
                        text={(l) => l.ui.page.rights.header}
                    /></BigLink
                >
            </div>
            <div class="column">
                <BigLink
                    smaller
                    external
                    to="https://discord.gg/Jh2Qq9husy"
                    subtitle={$locales.get(
                        (l) => l.ui.page.landing.link.community.subtitle,
                    )}
                    ><Iconified
                        icon="🗣️"
                        text={(l) => l.ui.page.landing.link.community.label}
                    /></BigLink
                >
                <BigLink
                    smaller
                    external
                    to="https://github.com/wordplaydev/wordplay/wiki/contribute"
                    subtitle={$locales.get(
                        (l) => l.ui.page.landing.link.contribute.subtitle,
                    )}
                    ><Iconified
                        icon="🛠️"
                        text={(l) => l.ui.page.landing.link.contribute.label}
                    />
                </BigLink>
            </div>
            <div class="column">
                <BigLink
                    smaller
                    to="/donate"
                    subtitle={$locales.get((l) => l.ui.page.donate.prompt)}
                >
                    <Iconified
                        icon="🤑"
                        text={(l) => l.ui.page.donate.header}
                    />
                </BigLink>
            </div>
        </div>
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
    }

    .actions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: stretch;
    }

    .details {
        display: flex;
        flex-direction: column;
        gap: calc(var(--wordplay-spacing) * 2);
        padding: calc(2 * var(--wordplay-spacing));
        min-height: 20em;
        margin-left: auto;
        margin-right: auto;
    }

    .links {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .column {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
        flex-grow: 1;
        flex-basis: 0;
    }
</style>
