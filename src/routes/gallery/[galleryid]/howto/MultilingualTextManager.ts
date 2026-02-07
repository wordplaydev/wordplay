import { SvelteMap } from "svelte/reactivity";


// input format: ['¶hello¶/en-US¶hola¶/es-MX', '¶bye¶/en-US¶adios¶/es-MX']
// output format: {'en-US': ['hello', 'bye'], 'es-MX': ['hola', 'adios']}
export function markupToMap(markup: string[]): SvelteMap<string, string[]> {
    let map: SvelteMap<string, string[]> = new SvelteMap<
        string,
        string[]
    >();

    markup.forEach((m) => {
        // dealing with cases of no markup, just text (i.e., how-to was created before translation was implemented)
        // 'en-US' was the hard-coded default locale, so we just use that
        if (/¶(.*?)¶\/(.{2,3})-(.{2})/.test(m) === false) {
            map.set('en-US', [m]);
            return;
        }

        let stringAndLocale = m.matchAll(/¶(.*?)¶\/(.{2,3})-(.{2})/g);

        stringAndLocale.forEach((match) => {
            console.log(match);
            let locale: string = `${match[2]}-${match[3]}`;
            let text: string = match[1];

            if (map.has(locale)) {
                map.get(locale)?.push(text);
            } else {
                map.set(locale, [text]);
            }
        });
    });

    return map;
}

/** takes a dictionary mapping locales to strings, returns the locales used and the text attached to them */
export function mapToMarkup(
    userInput: SvelteMap<string, string[]>,
    length: number
): [string[], string[]] {
    let usedLocales: Set<string> = new Set<string>();
    let markupTexts: string[] = Array(length).fill('');

    // input format: {'en-US': ['hello', 'bye'], 'es-MX': ['hola', 'adios']}
    // output format: ['¶hello¶/en-US¶hola¶/es-MX', '¶bye¶/en-US¶adios¶/es-MX']
    userInput.entries().forEach(([locale, text]) => {
        if (text.every((t) => t.length === 0)) return; // if all the text for this locale is empty, skip it

        usedLocales.add(locale);
        text.forEach((str, i) => {
            markupTexts[i] += `¶${str}¶/${locale}`;
        });
    });

    return [[...usedLocales], markupTexts];
}
