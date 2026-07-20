function supportsRegexNegativeLookBehind() {
    try {
        return 'hi'.replace(new RegExp('(?<!hi)hi', 'g'), 'ho');
    } catch (error) {
        return false;
    }
}

function supportsAt() {
    return [].at !== undefined;
}

// Intl.Segmenter is a hard dependency: grapheme segmentation (UnicodeString) and
// word/sentence segmentation (Markup, pattern matching) all use it with no fallback.
// Baseline in Chrome 87+, Safari 14.1+, Firefox 125+.
function supportsIntlSegmenter() {
    return typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
}

const unsupported = document.getElementById('unsupported');
if (unsupported) {
    if (
        !supportsRegexNegativeLookBehind() ||
        !supportsAt() ||
        !supportsIntlSegmenter()
    )
        unsupported.style.display = 'block';
    else unsupported.remove();
}
