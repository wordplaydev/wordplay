<script lang="ts">
    import Names from '@nodes/Names';
    import { Sym } from '@nodes/Sym';
    import {
        BIND_SYMBOL,
        EVAL_CLOSE_SYMBOL,
        EVAL_OPEN_SYMBOL,
    } from '@parser/Symbols';
    import type StructureValue from '@values/StructureValue';
    import { locales } from '@db/Database';
    import { toColor } from '@output/Color';
    import { getInteractive } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import SymbolView from '@components/values/SymbolView.svelte';
    import ValueView from '@components/values/ValueView.svelte';

    interface Props {
        value: StructureValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    const interactive = getInteractive();

    // A structure's collapsed state is a color swatch (for Color) or just the
    // toggle — not a prefix of its binds — so this is a binary disclosure, not
    // the incremental window used by list-like views.
    let expanded = $state(false);

    let isColor = $derived(
        value.is(value.context.getEvaluator().project.shares.output.Color),
    );
</script>

<!-- Inline structures show the name and binds -->
{#if inline}
    <SymbolView
        symbol={$locales.getName(value.type.names)}
        type={Sym.Name}
    /><SymbolView
        symbol={EVAL_OPEN_SYMBOL}
        type={Sym.EvalOpen}
    />{#if interactive.interactive && expanded}{#each [...value.context.getBindingsByNames()] as [name, val], index}<SymbolView
                symbol={$locales.getName(name)}
                type={Sym.Name}
            /><SymbolView symbol={BIND_SYMBOL} type={Sym.Bind} /><ValueView
                value={val}
                {inline}
            />{#if index < value.type.inputs.length - 1}{' '}{/if}{/each}{:else if isColor}<span
            class="color"
            style:background-color={toColor(value)?.toCSS()}
            >&ZeroWidthSpace;</span
        >{/if}{#if interactive.interactive}<Button
            tip={(l) =>
                expanded
                    ? l.ui.source.toggle.expandSequence.on
                    : l.ui.source.toggle.expandSequence.off}
            background
            padding={false}
            action={() => (expanded = !expanded)}>{expanded ? '▴' : '…'}</Button
        >{:else if !isColor}<span class="static">…</span
        >{/if}<SymbolView symbol={EVAL_CLOSE_SYMBOL} type={Sym.EvalClose} />

    <!-- Block structures are HTML tables -->
{:else}
    {@const color = value.is(
        value.context.getEvaluator().project.shares.output.Color,
    )}
    <table>
        <tbody>
            <tr
                ><th colspan={color ? 1 : 2}
                    ><SymbolView
                        symbol={$locales.getName(value.type.names)}
                        type={Sym.Name}
                    /></th
                >{#if color}
                    <th
                        ><span
                            class="color"
                            style:background-color={toColor(value)?.toCSS()}
                            >&ZeroWidthSpace;</span
                        ></th
                    >{/if}</tr
            >
            {#each [...value.context.getBindingsByNames()] as [name, val]}<tr
                    ><td
                        ><SymbolView
                            symbol={name instanceof Names
                                ? $locales.getName(name)
                                : name}
                            type={Sym.Name}
                        /></td
                    ><td><ValueView value={val} {inline} /></td></tr
                >{/each}
        </tbody>
    </table>
{/if}

<style>
    .color {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        vertical-align: middle;
    }

    .static {
        font-size: smaller;
        opacity: 0.6;
        white-space: nowrap;
        user-select: none;
    }
</style>
