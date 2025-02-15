<script lang="ts">
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import type { FieldText } from '@locale/UITexts';
    import Labeled from './Labeled.svelte';
    import TextBox from './TextBox.svelte';
    import TextField from './TextField.svelte';

    let {
        texts,
        fixed,
        text = $bindable<string>(),
        box = false,
        editable = true,
        id,
    }: {
        box?: boolean;
        text: string;
        texts: (locale: LocaleText) => FieldText;
        fixed?: string | undefined;
        editable?: boolean;
        id: string;
    } = $props();
</script>

<Labeled {fixed} label={$locales.get(texts).description}
    >{#if box}<TextBox
            {id}
            bind:text
            placeholder={$locales.get(texts).placeholder}
            description={$locales.get(texts).description}
            active={editable}
        ></TextBox>{:else}<TextField
            {id}
            bind:text
            placeholder={$locales.get(texts).placeholder}
            description={$locales.get(texts).description}
            {editable}
        ></TextField>{/if}</Labeled
>
