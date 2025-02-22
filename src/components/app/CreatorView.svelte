<script lang="ts">
    import Text from '@components/widgets/Text.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { withColorEmoji } from '../../unicode/emoji';
    import Feedback from './Feedback.svelte';

    interface Props {
        creator: Creator | null;
        anonymize?: boolean;
        chrome?: boolean;
        fade?: boolean;
        prompt?: boolean;
    }

    let {
        creator,
        anonymize = true,
        chrome = true,
        fade = false,
        prompt = false,
    }: Props = $props();

    let username = $derived(creator?.getUsername(anonymize) ?? '');
</script>

<div class="creator" class:chrome class:fade
    >{#if creator}<span
            class="name"
            style:animation-delay={`${Math.random() * 1000}ms`}
            >{withColorEmoji(
                creator.getName() === null || creator.getName() === ''
                    ? '😃'
                    : (creator.getName() ?? '😃'),
            )}</span
        >{/if}{#if creator}
        {username.length < 10
            ? username
            : `${username.substring(0, 10)}…`}{:else if prompt}<Text
            path={(l) => l.ui.page.login.anonymous}
        ></Text>{:else}
        <Feedback inline>—</Feedback>{/if}</div
>

<style>
    .creator {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
        justify-content: center;
        font-size: var(--wordplay-small-font-size);
    }

    .fade {
        color: var(--wordplay-inactive-color);
    }

    .chrome {
        border-radius: var(--wordplay-border-radius);
        border-top-left-radius: 1em;
        border-bottom-left-radius: 1em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        padding: calc(var(--wordplay-spacing) / 3);
        padding-left: var(--wordplay-spacing);
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
        font-family: 'Noto Color Emoji', 'Noto Emoji', 'Noto Sans';
        animation: rotate infinite ease-in 5s;
    }
</style>
