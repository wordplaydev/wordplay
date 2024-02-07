<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import Background from '../components/app/Background.svelte';
    import { locales } from '../db/Database';
    import Writing from '../components/app/Writing.svelte';
    // import Speech from '../components/lore/Speech.svelte';
    // import Glyphs from '../lore/Glyphs';
    // import Emotion from '../lore/Emotion';
    import MarkupHtmlView from '../components/concepts/MarkupHTMLView.svelte';
    import Beta from './Beta.svelte';
    import Lead from '@components/app/Lead.svelte';
    import Emoji from '@components/app/Emoji.svelte';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Writing>
    <Beta />
    <Header><Emoji>💬</Emoji>{$locales.get((l) => l.wordplay)}</Header>
    <Lead
        ><MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.landing.value)}
        /></Lead
    >
    <!-- <div class="welcome">
        <div style:width="10em" style:margin-inline-start="-2.5em">
            <Speech glyph={Glyphs.Function} emotion={Emotion.happy} big
                ><svelte:fragment slot="content"
                    ><MarkupHtmlView
                        markup={$locales.get((l) => l.ui.page.landing.call)}
                    /></svelte:fragment
                ></Speech
            >
        </div>
    </div> -->
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.landing.description)}
    />
    <br />
    <BigLink
        to="/learn"
        subtitle={$locales.get((l) => l.ui.page.landing.link.learn)}
        >{$locales.get((l) => l.ui.page.learn.header)}</BigLink
    >
    <BigLink
        to="/projects"
        subtitle={$locales.get((l) => l.ui.page.landing.link.projects)}
        >{$locales.get((l) => l.ui.page.projects.header)}</BigLink
    >
    <BigLink
        to="/galleries"
        subtitle={$locales.get((l) => l.ui.page.landing.link.galleries)}
        >{$locales.get((l) => l.ui.page.galleries.header)}</BigLink
    >
    <BigLink
        to="/login"
        subtitle={$locales.get((l) => l.ui.page.login.subtitle)}
        >{$locales.get((l) => l.ui.page.login.header)}</BigLink
    >
    <BigLink
        smaller
        to="/about"
        subtitle={$locales.get((l) => l.ui.page.landing.link.about)}
        >{$locales.get((l) => l.ui.page.about.header)}</BigLink
    >
    <BigLink
        smaller
        to="/rights"
        subtitle={$locales.get((l) => l.ui.page.landing.link.rights)}
        >{$locales.get((l) => l.ui.page.rights.header)}</BigLink
    >
    <BigLink
        smaller
        to="/donate"
        subtitle={$locales.get((l) => l.ui.page.donate.prompt)}
        >{$locales.get((l) => l.ui.page.donate.header)}</BigLink
    >
</Writing>

<!-- <style>
    .welcome {
        display: flex;
        flex-direction: row;
        gap: calc(var(--wordplay-spacing) * 2);
        margin-top: 2em;
        margin-bottom: 2em;
        max-width: 100%;
    }
</style> -->
