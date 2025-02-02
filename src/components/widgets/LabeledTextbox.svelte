<script lang="ts">
    import type LocaleText from '@locale/LocaleText';
    import type { FieldText } from '@locale/UITexts';
    import Labeled from './Labeled.svelte';
    import { locales } from '@db/Database';
    import TextBox from './TextBox.svelte';
    import TextField from './TextField.svelte';

    let {
        texts,
        fixed,
        text = $bindable<string>(),
        box = false,
        editable = true,
    }: {
        box?: boolean;
        text: string;
        texts: (locale: LocaleText) => FieldText;
        fixed?: string | undefined;
        editable?: boolean;
    } = $props();
</script>

<Labeled {fixed} label={$locales.get(texts).description}
    >{#if box}<TextBox
            bind:text
            placeholder={$locales.get(texts).placeholder}
            description={$locales.get(texts).description}
            active={editable}
        ></TextBox>{:else}<TextField
            bind:text
            placeholder={$locales.get(texts).placeholder}
            description={$locales.get(texts).description}
            {editable}
        ></TextField>{/if}</Labeled
>
