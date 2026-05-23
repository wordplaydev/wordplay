<script lang="ts">
    import Fonts, {
        faceSupportsWeight,
        type Face,
        type FontWeight,
    } from '@basis/Fonts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Scripts } from '@locale/Scripts';
    import { onMount } from 'svelte';

    interface Props {
        name: string;
        face: Face;
    }

    let { name, face }: Props = $props();

    let element: HTMLDivElement | undefined = $state();

    // The set of named weight/style features we surface as "missing" markers
    // when a face doesn't support them. Underline is universal so it's omitted.
    const features: { symbol: string; weight?: FontWeight; italic?: true }[] = [
        { symbol: '~', weight: 300 },
        { symbol: '*', weight: 700 },
        { symbol: '^', weight: 900 },
        { symbol: '/', italic: true },
    ];

    let missing = $derived(
        features.filter((f) =>
            f.italic
                ? !face.italic
                : f.weight !== undefined && !faceSupportsWeight(face, f.weight),
        ),
    );

    // Emoji-only faces (e.g. Noto Emoji, Noto Color Emoji) can't render their
    // own Latin name, so we render the name in the default font and show a
    // sample emoji in the actual face so the creator can see what it looks like.
    let emojiOnly = $derived(face.scripts.every((script) => script === 'Emoj'));

    // When this option becomes visible (e.g. the user opens the chooser and
    // scrolls past it), kick off a lightweight single-file load so the name
    // renders in its own face. Faces the user never scrolls to don't load.
    onMount(() => {
        if (
            element === undefined ||
            typeof IntersectionObserver === 'undefined'
        )
            return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                Fonts.loadFaceForPreview(name);
                observer.disconnect();
            }
        });
        observer.observe(element);
        return () => observer.disconnect();
    });
</script>

<div bind:this={element} class="face">
    <span class="name" style:font-family={emojiOnly ? undefined : name}
        >{name}{#if emojiOnly}
            <span class="sample" style:font-family={name}>😀💬🌲</span>
        {/if}</span
    >
    <sub>
        • {#each face.scripts as script, index}
            {#if index > 0},{/if}
            {Scripts[script]?.name ?? '?'}
        {/each}{#if missing.length > 0}
            , <span class="missing">
                <span class="word"
                    ><LocalizedText path={(l) => l.ui.font.missing} /></span
                >{#each missing as feature}<span class="marker"
                        >{feature.symbol}</span
                    >{/each}
            </span>
        {/if}
    </sub>
</div>

<style>
    .face {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    .name {
        white-space: nowrap;
    }

    .sample {
        margin-inline-start: var(--wordplay-spacing-half);
    }

    .missing {
        margin-inline-start: var(--wordplay-spacing-half);
    }

    .word {
        color: var(--wordplay-error);
    }

    .marker {
        color: var(--wordplay-error);
        font-family: var(--wordplay-code-font);
        margin-inline-start: calc(var(--wordplay-spacing-half) / 2);
    }
</style>
