<script lang="ts">
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Labeled from '@components/widgets/Labeled.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import TextField from '@components/widgets/TextField.svelte';

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

<Labeled {fixed} label={description}
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
