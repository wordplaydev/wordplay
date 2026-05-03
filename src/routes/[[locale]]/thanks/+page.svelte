<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Page from '@components/app/Page.svelte';
    import contributorsData from './contributors.json';
    import type { Contributor } from './types';

    const contributors = contributorsData.contributors as Contributor[];
</script>

<Page>
    <div class="content">
        <Header text={(l) => l.ui.page.thanks.header} />
        <MarkupHTMLView
            markup={[(l) => l.ui.page.thanks.intro, contributors.length]}
        />
        {#if contributors.length > 0}
            <div class="grid">
                {#each contributors as contributor}
                    <Link to={contributor.html_url}>
                        <div class="card">
                            <img
                                src={contributor.avatar_url}
                                alt={contributor.login}
                                width="48"
                                height="48"
                            />
                            <div class="info">
                                {#if contributor.name}
                                    <span class="name">{contributor.name}</span>
                                {/if}
                                <span class="login">@{contributor.login}</span>
                            </div>
                        </div>
                    </Link>
                {/each}
            </div>
        {/if}
    </div>
</Page>

<style>
    .content {
        margin-inline: auto;
        width: min(90%, 80em);
        margin-block: 4em;
    }

    .grid {
        display: flex;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        margin-block-start: 2em;
    }

    .card {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing-half) var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        transition: background-color 0.1s;
    }

    .card:hover {
        background-color: var(--wordplay-alternating-color);
    }

    .card img {
        border-radius: 50%;
        flex-shrink: 0;
    }

    .info {
        display: flex;
        flex-direction: column;
    }

    .name {
        font-weight: bold;
        font-size: var(--wordplay-font-size);
    }

    .login {
        font-size: calc(var(--wordplay-font-size) - 2pt);
        opacity: 0.7;
    }
</style>
