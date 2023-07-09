export default async function getDefaultLocale(test: boolean = false) {
    return await (
        await fetch(`${test ? 'http://localhost:5173' : ''}/locales/en/en.json`)
    ).json();
}
