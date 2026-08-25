import { reachFrom } from './src/util/importGraph';
console.log(reachFrom('src/components/app/Page.svelte', process.cwd()).bytes);
