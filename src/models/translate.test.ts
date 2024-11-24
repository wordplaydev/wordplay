import { test, expect } from 'vitest';

// Mock the `names` object and its methods
class MockName {
    constructor(public name: string, public language: string | undefined) {}
    getName() {
        return this.name;
    }
    isLanguage(lang: string) {
        return this.language === lang;
    }
    hasLanguage() {
        return this.language !== undefined;
    }
}

// Test Cases
test.each([
    {
        // No conflict case
        initialNames: [new MockName("hello", "en")],
        translation: "hola",
        expectedResult: "hola",
    },
    {
        // Conflict case: "hello" already exists
        initialNames: [new MockName("hello", "en"), new MockName("hello", "es")],
        translation: "hello",
        expectedResult: "hello2",
    },
    {
        // Multiple conflicts: "hello", "hello2" exist
        initialNames: [
            new MockName("hello", "en"),
            new MockName("hello", "es"),
            new MockName("hello2", "es"),
        ],
        translation: "hello",
        expectedResult: "hello3",
    },
])(
    "Resolves naming conflicts for translations",
    ({ initialNames, translation, expectedResult }) => {
        // Create a Set of existing names
        const existingNames = new Set(
            initialNames.map((name) => name.getName())
        );

        let uniqueTranslation = translation;
        let count = 2;

        // Resolve conflicts
        while (existingNames.has(uniqueTranslation)) {
            uniqueTranslation = `${translation}${count}`;
            count++;
        }

        existingNames.add(uniqueTranslation);

        // Assert the result
        expect(uniqueTranslation).toBe(expectedResult);
    }
);

