<script module lang="ts">
    export type GlyphsPageText = {
        /** Header for the glyphs page */
        header: string;
        /** Explanation for the glyphs page */
        prompt: string;
        /** Buttons for the page */
        button: {
            /** Create a new project */
            new: string;
        };
        error: {
            /** When there's no access to the database. */
            offline: string;
            /** When not logged in */
            noauth: string;
            /** Problem creating a glyph */
            create: string;
        };
    };
</script>

<script lang="ts">
    import Writing from '@components/app/Writing.svelte';
    import Header from '@components/app/Header.svelte';
    import { GlyphsDB, locales } from '@db/Database';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import { firestore } from '@db/firebase';
    import Feedback from '@components/app/Feedback.svelte';
    import { goto } from '$app/navigation';
    import Spinning from '@components/app/Spinning.svelte';
    import { glyphToSVG, type Glyph } from '../../glyphs/glyphs';
    import Link from '@components/app/Link.svelte';

    const user = getUser();

    let creating: boolean | undefined = $state(false);

    async function addGlyph() {
        creating = true;
        const id = await GlyphsDB.createGlyph();
        if (id) {
            creating = false;
            goto(`/glyph/${id}`);
        } else creating = undefined;
    }

    let glyphs = $derived(GlyphsDB.getOwnedGlyphs());
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.glyphs.header)}</title>
</svelte:head>

{#snippet preview(glyph: Glyph)}
    <Link to="/glyph/{glyph.id}">
        <div class="preview">
            <div class="glyph">
                {@html glyphToSVG(glyph, 64)}
            </div>
            <div class="name"
                >{#if glyph.name.length === 0}—{:else}{glyph.name}{/if}</div
            >
        </div>
    </Link>
    <style>
        .preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--wordplay-spacing);
        }

        .glyph {
            display: inline-block;
            width: 64px;
            height: 64px;
            border: var(--wordplay-border-color) solid
                var(--wordplay-border-width);
        }
    </style>
{/snippet}

<Writing>
    <Header>{$locales.get((l) => l.ui.page.glyphs.header)}</Header>
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.glyphs.prompt)} />

    {#if firestore === undefined}
        <Feedback
            >{$locales.get((l) => l.ui.page.glyphs.error.offline)}</Feedback
        >
    {:else if $user === null}
        <Feedback>{$locales.get((l) => l.ui.page.glyphs.error.noauth)}</Feedback
        >
    {:else}
        {#if creating}
            <Spinning></Spinning>
        {:else if creating === undefined}
            <Feedback
                >{$locales.get((l) => l.ui.page.glyphs.error.create)}</Feedback
            >
        {:else}
            <Button
                tip={$locales.get((l) => l.ui.page.glyphs.button.new)}
                action={addGlyph}
                active={!creating}
                ><span style:font-size="xxx-large">+</span>
            </Button>
        {/if}

        <div class="glyphs">
            {#each glyphs.values() as glyph}
                {#if glyph !== null}
                    {@render preview(glyph)}
                {/if}
            {/each}
        </div>
    {/if}
</Writing>

<style>
    .glyphs {
        display: flex;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        justify-content: start;
    }
</style>
