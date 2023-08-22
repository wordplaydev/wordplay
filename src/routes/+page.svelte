<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Header from '@components/app/Header.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import Background from '../components/app/Background.svelte';
    import { locale } from '../db/Database';
    import Writing from '../components/app/Writing.svelte';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Writing>
    <Header>{$locale.wordplay}<sub>.dev</sub></Header>
    <p>{$locale.ui.phrases.motto}</p>
    {#if PUBLIC_CONTEXT === 'prod'}
        <p
            >Coming Fall 2023. Write <a href="https://amyjko.com">Amy</a> for details.</p
        >
    {:else}
        <BigLink to="/learn">{$locale.ui.header.learn}</BigLink>
        <BigLink to="/projects">{$locale.ui.header.projects}</BigLink>
        <BigLink to="/galleries">{$locale.ui.header.galleries}</BigLink>
        <BigLink to="/about">{$locale.ui.header.about}</BigLink>
    {/if}
</Writing>

<style>
    sub {
        font-size: 30%;
    }
</style>
