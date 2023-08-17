<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Lead from '@components/app/Lead.svelte';
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
    <Lead>{$locale.wordplay}<sub>.dev</sub></Lead>
    <p>{$locale.ui.phrases.motto}</p>
    {#if PUBLIC_CONTEXT === 'prod'}
        <p
            >Coming Fall 2023. Write <a href="https://amyjko.com">Amy</a> for details.</p
        >
    {:else}
        <BigLink to="/learn">{$locale.ui.header.learn}</BigLink>
        <BigLink to="/projects">{$locale.ui.header.projects}</BigLink>
        <BigLink to="/about">{$locale.ui.header.about}</BigLink>
    {/if}
</Writing>

<style>
    sub {
        font-size: 30%;
    }
    p {
        font-size: min(3vw, 40pt);
        font-style: it;
    }
</style>
