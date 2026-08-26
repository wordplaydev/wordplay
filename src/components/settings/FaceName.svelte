<script lang="ts">
    import Fonts, {
        faceSupportsWeight,
        type Face,
        type FontWeight,
    } from '@basis/faces/Fonts';
    import { describeFaceLocalized } from '@basis/faces/faceWords';
    import { locales } from '@db/Database';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type LocaleText from '@locale/LocaleText';
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
    const features: {
        symbol: string;
        word: (l: LocaleText) => string;
        weight?: FontWeight;
        italic?: true;
    }[] = [
        { symbol: '~', word: (l) => l.ui.palette.labels.light, weight: 300 },
        { symbol: '*', word: (l) => l.ui.palette.labels.bold, weight: 700 },
        { symbol: '^', word: (l) => l.ui.palette.labels.extra, weight: 900 },
        { symbol: '/', word: (l) => l.ui.palette.labels.italic, italic: true },
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

    // What the face looks like, in words. Rendered as visible text rather than
    // an aria-description on purpose: it becomes part of the option's
    // accessible name for free, and a creator who *can* see the preview still
    // can't tell Doto from Codystar by name either.
    let words = $derived(describeFaceLocalized($locales, face));

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
    {#if words.length > 0}<sub class="words">{words}</sub>{/if}
    <sub>
        <!-- The scripts a face can write, shown in their own letters because
             that is itself a preview of what the face renders — but read aloud
             in English, since a voice given "Ελληνικά" reads Greek letters
             rather than the word "Greek". -->
        •
        <span aria-hidden="true"
            >{#each face.scripts as script, index}{#if index > 0},
                {/if}{Scripts[script]?.name ?? '?'}{/each}</span
        ><span class="reader"
            >{face.scripts
                .map((script) => Scripts[script]?.en ?? '?')
                .join(', ')}</span
        >{#if missing.length > 0}
            , <span class="missing">
                <span class="word"
                    ><LocalizedText path={(l) => l.ui.font.missing} /></span
                >
                <!-- The markers are the same glyphs the editor uses for these
                     styles, which is why they're shown — but read aloud they are
                     "tilde asterisk caret slash", so the words go beside them. -->
                <span aria-hidden="true"
                    >{#each missing as feature}<span class="marker"
                            >{feature.symbol}</span
                        >{/each}</span
                ><span class="reader"
                    >{missing
                        .map((feature) =>
                            $locales.getPrimaryPlainText(feature.word),
                        )
                        .join(', ')}</span
                >
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

    .words {
        color: var(--wordplay-inactive-color);
    }

    /* Read aloud, never seen: the sighted equivalent sits beside it. */
    .reader {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
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
