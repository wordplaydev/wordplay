<script lang="ts">
    import { getEmoji } from '../../unicode/Unicode';
    import Button from './Button.svelte';

    interface Props {
        pick: (emoij: string) => void;
        emoji: string;
    }

    let { pick, emoji }: Props = $props();
</script>

<div class="picker">
    {#each getEmoji() as code}
        <div
            class="emoji"
            class:selected={String.fromCodePoint(code.hex) === emoji}
            ><Button
                tip={code.name}
                action={() => pick(String.fromCodePoint(code.hex))}
                ><span class="emoji">{String.fromCodePoint(code.hex)}</span
                ></Button
            ></div
        >
    {/each}
</div>

<style>
    .picker {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        width: 100%;
        max-height: 10em;
        overflow-y: auto;
    }

    .emoji {
        font-family: 'Noto Color Emoji';
    }

    .selected {
        transform: scale(2);
    }
</style>
