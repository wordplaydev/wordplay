<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Header from '@components/app/Header.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import Background from '../components/app/Background.svelte';
    import { locale } from '../db/Database';
    import Writing from '../components/app/Writing.svelte';
    import Link from '../components/app/Link.svelte';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Writing>
    <Header>{$locale.wordplay}<sub>.dev</sub></Header>
    <p>{$locale.ui.page.landing.motto}</p>
    {#if PUBLIC_CONTEXT === 'prod'}
        <p
            >Coming Fall 2023. Write <a href="https://amyjko.com">Amy</a> for details.</p
        >
    {:else}
        <p><BigLink to="/learn">{$locale.ui.page.learn.header}</BigLink></p>
        <p
            ><BigLink to="/projects">{$locale.ui.page.projects.header}</BigLink
            ></p
        >
        <p
            ><BigLink to="/galleries"
                >{$locale.ui.page.galleries.header}</BigLink
            ></p
        >
        <p><Link to="/about">{$locale.ui.page.about.header}</Link></p>
        <p><Link to="/rights">{$locale.ui.page.rights.header}</Link></p>
    {/if}
</Writing>

<style>
    sub {
        font-size: 30%;
    }
</style>
