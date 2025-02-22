<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Labeled from './Labeled.svelte';
    import TextBox from './TextBox.svelte';
    import TextField from './TextField.svelte';

    let {
        placeholder,
        description,
        fixed,
        text = $bindable<string>(),
        box = false,
        editable = true,
        id,
    }: {
        box?: boolean;
        text: string;
        placeholder: LocaleTextAccessor;
        description: LocaleTextAccessor;
        fixed?: string | undefined;
        editable?: boolean;
        id: string;
    } = $props();
</script>

<Labeled {fixed} label={$locales.get(description)}
    >{#if box}<TextBox
            {id}
            bind:text
            {placeholder}
            {description}
            active={editable}
        ></TextBox>{:else}<TextField
            {id}
            bind:text
            {placeholder}
            {description}
            {editable}
        ></TextField>{/if}</Labeled
>
