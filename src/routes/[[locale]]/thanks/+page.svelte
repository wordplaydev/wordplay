<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Page from '@components/app/Page.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import contributorsData from './contributors.json';
    import teachersData from './teachers.json';
    import type { Contributor, Teacher } from './types';

    const total = (c: Contributor) =>
        Object.values(c.counts).reduce((sum, n) => sum + n, 0);

    const contributors = (contributorsData.contributors as Contributor[])
        .slice()
        .sort((a, b) => {
            const dayCompare = b.latest
                .slice(0, 10)
                .localeCompare(a.latest.slice(0, 10));
            return dayCompare !== 0 ? dayCompare : total(b) - total(a);
        });
    const teachers = teachersData.teachers as Teacher[];
</script>

<Page>
    <div class="content">
        <Header text={(l) => l.ui.page.thanks.header} />
        <MarkupHTMLView
            markup={[
                (l) => l.ui.page.thanks.intro,
                { count: contributors.length },
            ]}
        />
        {#if teachers.length > 0}
            <Subheader text={(l) => l.ui.page.thanks.teachers} />
            <div class="grid">
                {#each teachers as teacher}
                    <Link to={teacher.url}>
                        <div class="card">
                            <div class="info">
                                <span class="name">{teacher.name}</span>
                                <span class="login">{teacher.school}</span>
                            </div>
                        </div>
                    </Link>
                {/each}
            </div>
        {/if}
        {#if contributors.length > 0}
            <Subheader text={(l) => l.ui.page.thanks.contributors} />
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
    }
</style>
