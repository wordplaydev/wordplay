<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Header from '@components/app/Header.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import Background from '../components/app/Background.svelte';
    import { locale } from '../db/Database';
    import Writing from '../components/app/Writing.svelte';
    import Speech from '../components/lore/Speech.svelte';
    import Glyphs from '../lore/Glyphs';
    import Emotion from '../lore/Emotion';
    import MarkupHtmlView from '../components/concepts/MarkupHTMLView.svelte';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Writing>
    <Header>{$locale.wordplay}<sub>.dev</sub></Header>
    <div class="welcome">
        <Speech glyph={Glyphs.Function} emotion={Emotion.happy}
            ><svelte:fragment slot="content"
                ><MarkupHtmlView
                    markup={$locale.ui.page.landing.call}
                /></svelte:fragment
            ></Speech
        >
    </div>
    {#if PUBLIC_CONTEXT === 'prod'}
        <p
            >Coming Fall 2023. Write <a href="https://amyjko.com">Amy</a> for details.</p
        >
    {:else}
        <BigLink to="/learn" subtitle={$locale.ui.page.landing.link.learn}
            >{$locale.ui.page.learn.header}</BigLink
        >
        <BigLink to="/projects" subtitle={$locale.ui.page.landing.link.projects}
            >{$locale.ui.page.projects.header}</BigLink
        >
        <BigLink
            to="/galleries"
            subtitle={$locale.ui.page.landing.link.galleries}
            >{$locale.ui.page.galleries.header}</BigLink
        >
        <BigLink to="/rights" subtitle={$locale.ui.page.landing.link.rights}
            >{$locale.ui.page.rights.header}</BigLink
        >
        <BigLink to="/about" subtitle={$locale.ui.page.landing.link.about}
            >{$locale.ui.page.about.header}</BigLink
        >
    {/if}
</Writing>

<style>
    sub {
        font-size: 30%;
    }

    .welcome {
        margin-inline-start: -1em;
        margin-top: 2em;
        margin-bottom: 2em;
        width: 50%;
    }
</style>
