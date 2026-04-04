<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Options from '@components/widgets/Options.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import { isMachineTranslated } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { MACHINE_TRANSLATED_SYMBOL } from '@parser/Symbols';
    import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
    import { onMount } from 'svelte';

    // Lazily fetched JSON Schema — not bundled
    let schema = $state<Record<string, unknown> | undefined>(undefined);

    onMount(async () => {
        const response = await fetch('/schemas/LocaleText.json');
        if (response.ok) schema = await response.json();
    });

    function resolveRef(
        s: Record<string, unknown>,
        ref: string,
    ): Record<string, unknown> | undefined {
        const parts = ref.replace('#/', '').split('/');
        let node: unknown = s;
        for (const part of parts) {
            if (typeof node !== 'object' || node === null) return undefined;
            node = (node as Record<string, unknown>)[decodeURIComponent(part)];
        }
        return typeof node === 'object' && node !== null
            ? (node as Record<string, unknown>)
            : undefined;
    }

    function getDescription(pathStr: string): string | undefined {
        if (!schema) return undefined;
        const parts = pathStr.split('.');
        let node: Record<string, unknown> | undefined = (
            schema.definitions as Record<string, unknown> | undefined
        )?.['LocaleText'] as Record<string, unknown> | undefined;

        for (const part of parts) {
            if (!node) return undefined;
            // Resolve $ref to get access to properties
            const ref = node['$ref'];
            if (typeof ref === 'string') node = resolveRef(schema, ref);
            if (!node) return undefined;
            const props = node['properties'] as
                | Record<string, unknown>
                | undefined;
            node = props?.[part] as Record<string, unknown> | undefined;
        }

        if (!node) return undefined;
        if (typeof node['description'] === 'string') return node['description'];
        // Fall back to the description on the referenced definition
        const ref = node['$ref'];
        if (typeof ref === 'string') {
            const resolved = resolveRef(schema, ref);
            if (typeof resolved?.['description'] === 'string')
                return resolved['description'] as string;
        }
        return undefined;
    }

    const allPaths = $derived.by(() => {
        const locale = $locales.getLocale();
        return getKeyTemplatePairs(
            locale as unknown as Record<string, unknown>,
        );
    });

    function isMT(pair: (typeof allPaths)[number]) {
        const val = pair.value;
        if (typeof val === 'string') return isMachineTranslated(val);
        if (Array.isArray(val)) return val.some((v) => isMachineTranslated(v));
        return false;
    }

    const options = $derived(
        [...allPaths]
            .sort((a, b) => {
                const aMT = isMT(a);
                const bMT = isMT(b);
                if (aMT === bMT) return 0;
                return aMT ? -1 : 1;
            })
            .map((pair) => ({
                value: pair.toString(),
                label: `${isMT(pair) ? MACHINE_TRANSLATED_SYMBOL + ' ' : ''}${pair.toString()}`,
                description: getDescription(pair.toString()),
            })),
    );

    let selectedPath = $state<string | undefined>(undefined);

    const selectedPair = $derived(
        allPaths.find((p) => p.toString() === selectedPath),
    );

    const selectedText = $derived.by(() => {
        if (!selectedPair) return '';
        const val = selectedPair.value;
        if (typeof val === 'string') return withoutAnnotations(val);
        if (Array.isArray(val))
            return val.map((v) => withoutAnnotations(v)).join('\n');
        return '';
    });

    let editedText = $state('');

    $effect(() => {
        editedText = selectedText;
    });
</script>

<Subheader>
    <LocalizedText path={(l) => l.ui.localize.header} />
</Subheader>
<MarkupHTMLView markup={(l) => l.ui.localize.description} />

{#if allPaths.length > 0}
    <div class="mt-editor">
        <Options
            value={selectedPath}
            label="Machine translated strings"
            {options}
            change={(val) => {
                selectedPath = val;
            }}
            width="100%"
        >
            {#snippet item(option, localized)}
                <span class="option-item">
                    <span class="option-label"
                        >{@render localized(option.label)}</span
                    >
                    {#if option.description}
                        <Note>{option.description}</Note>
                    {/if}
                </span>
            {/snippet}
        </Options>
        {#if selectedPath !== undefined}
            <TextField
                id="localize-mt-field"
                description={(l) => l.ui.localize.field.description}
                placeholder={(l) => l.ui.localize.field.placeholder}
                bind:text={editedText}
                fill
            />
        {/if}
    </div>
{/if}

<style>
    .mt-editor {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-top: var(--wordplay-spacing);
    }

    .option-item {
        display: flex;
        flex-direction: column;
        color: var(--wordplay-foreground);
    }
</style>
