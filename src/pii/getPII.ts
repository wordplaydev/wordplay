/** These regular expressions are rough matchers on different types of common PII. There will be false positives and true negatives. */
export const EmailRegex = /[\w-.]+@(?:[\w-]+\.)+[\w-]{2,4}/g;
export const PhoneNumberRegex =
    /(?:\+\d{1,2}\s?)?(?:\(?\d{3}[\s.-]?\)?){1,2}[\s.-]?\d{4}/g;
export const SSNRegex =
    /(?!0{3})(?!6{3})[0-8]\d{2}-(?!0{2})\d{2}-(?!0{4})\d{4}/g;
export const HandleRegex = /(?<![a-zA-Z])@[a-zA-Z_]+/g;
export const AddressRegex = /[0-9]{2-7} [A-Z][A-Za-z-]+/g;

// First and last name (e.g., a creator adds their name to a project)
// A home or other physical address, including street name and city or town (e.g., a creator creates a map of where they live)

export type PIIKind = 'email' | 'phone' | 'tin' | 'handle' | 'address';
export type PII = { kind: PIIKind; text: string };

/**
 * Given a text string, detect possible personally-identifiable information.
 * We primarily use this to warn when it might be shared in a project and
 * to prevent persisting potential PII in the database. Hepls with compliance with
 * privacy laws too, like COPPA.
 **/
export default function getPII(text: string): PII[] {
    /** Avoid catastrophic backtracking on long strings */
    return text.length > 100
        ? []
        : [
              ...matchesToPII(text, 'email', EmailRegex),
              ...matchesToPII(text, 'phone', PhoneNumberRegex),
              ...matchesToPII(text, 'tin', SSNRegex),
              ...matchesToPII(text, 'handle', HandleRegex),
              ...matchesToPII(text, 'address', AddressRegex),
          ];
}

function matchesToPII(text: string, kind: PIIKind, regex: RegExp): PII[] {
    return Array.from(text.matchAll(regex))
        .map((matches) =>
            matches.map((text) => {
                return { kind, text };
            }),
        )
        .flat();
}
