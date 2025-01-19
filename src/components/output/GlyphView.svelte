<script lang="ts">
    import { GlyphsDB } from '@db/Database';
    import {
        glyphToSVG,
        unknownGlyphSVG,
        type Glyph,
    } from '../../glyphs/glyphs';
    import { UNPARSABLE_SYMBOL } from '@parser/Symbols';

    let { name }: { name: string } = $props();

    let glyph = $state<Glyph | 'loading' | null>('loading');
    /** When the glyph changes, load the glyph */
    $effect(() => {
        if (name) {
            glyph = 'loading';
            GlyphsDB.getGlyph(name).then((g) => {
                glyph = g === undefined ? null : g;
            });
        }
    });
</script>

{#if glyph === 'loading'}
    …
{:else}
    <div class="glyph">
        {#if glyph}
            {@html glyphToSVG(glyph, '1em')}
        {:else}
            {@html unknownGlyphSVG('1em')}
        {/if}
    </div>
{/if}

<style>
    .glyph {
        display: inline-block;
        vertical-align: top;
    }
</style>
