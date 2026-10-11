<script lang="ts">
    import { locales } from '#db/Database.ts';
    import type AnyType from '#nodes/AnyType.ts';
    import { PATTERN_ANY_SYMBOL } from '#parser/Symbols.ts';

    interface Props {
        node: AnyType;
    }

    let { node: _ }: Props = $props();
</script>

<!-- The any type can't be declared, so it has no tokens to render; it borrows the pattern
     sublanguage's "any" glyph, which is only ever lexed inside a pattern. -->
<span
    class="any"
    role="img"
    aria-label={$locales.getPrimaryPlainText((l) => l.node.AnyType.description)}
    >{PATTERN_ANY_SYMBOL}</span
>

<style>
    .any {
        font-family: var(--wordplay-code-font);
        color: var(--wordplay-type-color);
    }
</style>
