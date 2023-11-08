<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import Background from '../components/app/Background.svelte';
    import { locales } from '../db/Database';
    import Writing from '../components/app/Writing.svelte';
    import Speech from '../components/lore/Speech.svelte';
    import Glyphs from '../lore/Glyphs';
    import Emotion from '../lore/Emotion';
    import MarkupHtmlView from '../components/concepts/MarkupHTMLView.svelte';
    import Beta from './Beta.svelte';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Writing>
    <Header>{$locales.get((l) => l.wordplay)}<sub>.dev</sub></Header>
    <div class="welcome">
        <Speech glyph={Glyphs.Function} emotion={Emotion.happy} big
            ><svelte:fragment slot="content"
                ><MarkupHtmlView
                    markup={$locales.get((l) => l.ui.page.landing.call)}
                /></svelte:fragment
            ></Speech
        >
    </div>
    <Beta />
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
        to="/about"
        subtitle={$locales.get((l) => l.ui.page.landing.link.about)}
        >{$locales.get((l) => l.ui.page.about.header)}</BigLink
    >
    <BigLink
        to="/rights"
        subtitle={$locales.get((l) => l.ui.page.landing.link.rights)}
        >{$locales.get((l) => l.ui.page.rights.header)}</BigLink
    >
    <BigLink
        to="/donate"
        subtitle={$locales.get((l) => l.ui.page.donate.prompt)}
        >{$locales.get((l) => l.ui.page.donate.header)}</BigLink
    >
</Writing>

<style>
    sub {
        font-size: 30%;
    }

    .welcome {
        margin-inline-start: -3em;
        margin-top: 2em;
        margin-bottom: 2em;
        max-width: 100%;
    }
</style>
