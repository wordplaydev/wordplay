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

const unsupported = document.getElementById('unsupported');
if (unsupported) {
    if (!supportsRegexNegativeLookBehind() || !supportsAt())
        unsupported.style.display = 'block';
    else unsupported.remove();
}
