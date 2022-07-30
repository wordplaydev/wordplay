<script lang="ts">
    import type Structure from "../runtime/Structure";
    import GroupView from "./GroupView.svelte";

    export let verse: Structure;
    $: group = verse.resolve("group") as Structure;

</script>

<div style={`width: 100%; height: auto;`}>
    <GroupView group={group} />
</div>
