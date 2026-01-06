<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Options, { type Option } from '@components/widgets/Options.svelte';
    import { HowTos, HowToSocials, locales, Projects } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import HowToSocial from '@db/howtos/HowToSocialDatabase.svelte';
    import type Project from '@db/projects/Project';
    import { docToMarkup } from '@locale/LocaleText';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import HowToPrompt from './HowToPrompt.svelte';

    interface Props {
        howToSocial: HowToSocial | undefined;
    }

    let { howToSocial = $bindable(undefined) }: Props = $props();

    let howToId = $derived(howToSocial ? howToSocial.getHowToID() : '');

    // the ID of the new project / how-to to add to the list of those that used this how-to
    let usedByProjectToAdd: string | undefined = $state(undefined);

    // projects / how-tos that are using this how-to
    let howToUsedByIds: string[] = $derived(howToSocial?.getUsedByProjects() ?? []);

    // get all of the projects and how-tos that the user has access to
    // if that project or how-to not yet been added to the used-by list, give it as an option in the dropdown
    // if it has been added already, include it in the list to display
    let usedProjects: Project[] = $derived(
        Projects.allEditableProjects.filter((p) => {
            return howToUsedByIds.includes(p.getID());
        }),
    );
    let usedHowTos: HowTo[] = $derived(
        HowTos.allEditableHowTos.filter((ht) => {
            return howToUsedByIds.includes(ht.getHowToId());
        }),
    );

    let unusedProjects: Project[] = $derived(
        Projects.allEditableProjects.filter((p) => {
            return !howToUsedByIds.includes(p.getID());
        }),
    );
    let unusedHowTos: HowTo[] = $derived(
        HowTos.allEditableHowTos.filter((ht) => {
            return !howToUsedByIds.includes(ht.getHowToId());
        }),
    );

    // compute which options to display in the dropdown
    let dropdownOptions: Option[] = $derived([
        { value: undefined, label: '—' },
        ...unusedProjects.map((p) => ({
            value: p.getID(),
            label: p.getName(),
        })),
        ...unusedHowTos
            .filter((ht) => ht.getHowToId() != howToId)
            .map((ht) => ({
                value: ht.getHowToId(),
                label: ht.getTitle(),
            })),
    ]);

    // compute how many other projects / how-tos have used this how-to
    let numOtherUsedBy: number = $derived(
        howToUsedByIds.length - usedProjects.length - usedHowTos.length,
    );

    function addUsedByToList() {
        if (!howToSocial || !usedByProjectToAdd) return;

        let newUsedByProjects = howToSocial.getUsedByProjects();

        if (!newUsedByProjects.includes(usedByProjectToAdd)) {
            newUsedByProjects.push(usedByProjectToAdd);

            howToSocial = new HowToSocial({
                ...howToSocial.getData(),
                usedByProjects: newUsedByProjects,
            });

            HowToSocials.updateHowToSocial(howToSocial, true);
        }

        usedByProjectToAdd = undefined;
    }

    function removeFromUsedByList(id: string) {
        if (!howToSocial) return;

        let newUsedByProjects = howToSocial
            .getUsedByProjects()
            .filter((pid) => pid !== id);

        howToSocial = new HowToSocial({
            ...howToSocial.getData(),
            usedByProjects: newUsedByProjects,
        });

        HowToSocials.updateHowToSocial(howToSocial, true);
    }
</script>

{#snippet usedItem(name: string, id: string)}
    <form class="form">
        <MarkupHTMLView
            inline
            markup={docToMarkup($locales.get((l) => name))}
        />
        <Button
            submit
            padding={false}
            tip={(l) => l.ui.howto.viewer.usedBy.removeButton}
            action={() => {
                removeFromUsedByList(id);
            }}
            icon={CANCEL_SYMBOL}
        ></Button>
    </form>
{/snippet}

<HowToPrompt text={(l) => l.ui.howto.viewer.usedBy.prompt} />

{#each usedProjects as project (project.getID())}
    {@render usedItem(project.getName(), project.getID())}
{/each}

{#each usedHowTos as howToItem (howToItem.getHowToId())}
    {@render usedItem(howToItem.getTitle(), howToItem.getHowToId())}
{/each}

<form class="form">
    <Options
        id="usedBySelector"
        bind:value={usedByProjectToAdd}
        label={(l) => l.ui.howto.viewer.usedBy.selector}
        options={dropdownOptions}
        change={() => {}}
    />
    <Button
        submit
        background
        tip={(l) => l.ui.howto.viewer.usedBy.addButton}
        active={usedByProjectToAdd !== undefined}
        action={() => {
            addUsedByToList();
        }}>&gt;</Button
    >
</form>
<MarkupHTMLView
    inline
    markup={docToMarkup(
        $locales.get((l) => l.ui.howto.viewer.usedBy.countDisplay),
    ).concretize($locales, [numOtherUsedBy]) ?? ''}
/>
