// Load highlight.js lazily and once. The main module (rather than per-language subpaths) keeps
// this typed via its `export =` declaration and pre-registers the "common" languages, which
// already include python, javascript, java, and typescript. The dynamic import keeps it out of
// the main bundle.
async function loadHljs() {
    return (await import('highlight.js')).default;
}

let hljsPromise: ReturnType<typeof loadHljs> | null = null;

/** Syntax-highlight foreign code, returning HTML with `hljs-*` token classes for styling. */
export async function highlightExternal(
    hljsLanguage: string,
    code: string,
): Promise<string> {
    const hljs = await (hljsPromise ??= loadHljs());
    const html = hljs.highlight(code, {
        language: hljsLanguage,
        ignoreIllegals: true,
    }).value;
    // highlight.js's Java grammar leaves method calls and class references (e.g. the
    // System.out.println in `System.out.println("hi")`) untagged, unlike the Python/JS grammars
    // which tag built-ins like print/console. Color those names too so Java has visual parity in
    // the tutorial's contrast examples.
    return hljsLanguage === 'java' ? colorUntaggedNames(html) : html;
}

/**
 * Wrap method-call and capitalized class/type identifiers that highlight.js left unclassified.
 * Only text *outside* existing token spans is touched, so strings, comments, and keywords (already
 * tagged by hljs) are never re-colored — which also means keywords like `if (` can't be mistaken
 * for function calls, since they're already inside a `hljs-keyword` span.
 */
function colorUntaggedNames(html: string): string {
    let depth = 0;
    let out = '';
    const tokenRe = /(<span\b[^>]*>)|(<\/span>)|([^<]+)/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRe.exec(html)) !== null) {
        if (match[1]) {
            depth++;
            out += match[1];
        } else if (match[2]) {
            depth--;
            out += match[2];
        } else {
            // Enhance only top-level (unclassified) text.
            out += depth === 0 ? colorNames(match[3]) : match[3];
        }
    }
    return out;
}

/** A method call (identifier before `(`) becomes a function title; a capitalized identifier becomes
 *  a type. The two alternatives never overlap because the replacer runs once per match. */
function colorNames(text: string): string {
    return text.replace(
        /([A-Za-z_$][\w$]*)(?=\s*\()|\b[A-Z][\w$]*/g,
        (whole, fn) =>
            fn !== undefined
                ? `<span class="hljs-title function_">${fn}</span>`
                : `<span class="hljs-type">${whole}</span>`,
    );
}
