<script lang="ts">
    import type { Creator } from '@db/CreatorDatabase';
    import { locales } from '@db/Database';

    export let creator: Creator | null;
    export let anonymize = true;
</script>

<div class="creator"
    >{#if creator}<span
            class="name"
            style:animation-delay={`${Math.random() * 1000}ms`}
            >{creator.name ?? '😃'}</span
        >{/if}{creator
        ? creator.email === null
            ? '—'
            : anonymize || creator.email.endsWith('@wordplay.dev')
            ? creator.email.split('@')[0].substring(0, 4)
            : creator.email
        : $locales.get((l) => l.ui.page.login.anonymous)}</div
>

<style>
    .creator {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border-top-left-radius: 1em;
        border-bottom-left-radius: 1em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        padding: calc(var(--wordplay-spacing) / 3);
        padding-left: var(--wordplay-spacing);
        align-items: center;
        justify-content: center;
    }

    @keyframes rotate {
        0% {
            transform: rotate(10deg);
        }
        20% {
            transform: rotate(70deg);
        }
        50% {
            transform: rotate(-50deg);
        }
        80% {
            transform: rotate(10deg);
        }
        100% {
            transform: rotate(0deg);
        }
    }

    .name {
        display: inline-block;
        font-family: 'Noto Color Emoji', 'Noto Sans';
        animation: rotate infinite ease-in 5s;
    }
</style>
