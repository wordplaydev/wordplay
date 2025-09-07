#!/usr/bin/env node

/**
 * Console Testing Script for Search Functionality
 * 
 * This script allows you to test the search functionality from the command line
 * without needing to run the full application.
 */

import Fuse from 'fuse.js';

// Mock project data for testing
const mockProjects = [
    {
        project: { getName: () => 'Object Oriented Programming', getSources: () => [] },
        name: 'Object Oriented Programming',
        files: []
    },
    {
        project: { getName: () => 'Data Structures & Algorithms', getSources: () => [] },
        name: 'Data Structures & Algorithms',
        files: []
    },
    {
        project: { getName: () => 'Test Project', getSources: () => [] },
        name: 'Test Project',
        files: []
    },
    {
        project: {
            getName: () => 'Main Project',
            getSources: () => [
                { getPreferredName: () => 'main.wp' },
                { getPreferredName: () => 'utils.js' }
            ]
        },
        name: 'Main Project',
        files: [
            { name: 'main.wp' },
            { name: 'utils.js' }
        ]
    },
    {
        project: { getName: () => 'React Tutorial', getSources: () => [] },
        name: 'React Tutorial',
        files: []
    },
    {
        project: { getName: () => 'JavaScript Basics', getSources: () => [] },
        name: 'JavaScript Basics',
        files: []
    },
    // Add archived projects for testing
    {
        project: { getName: () => 'Archived Math Project', getSources: () => [] },
        name: 'Archived Math Project',
        files: []
    },
    {
        project: { getName: () => 'Old Science Experiment', getSources: () => [] },
        name: 'Old Science Experiment',
        files: []
    }
];

// Fuse.js configuration (same as in the app)
const fuseOptions = {
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
    keys: ['name', 'files.name']
};

const fuse = new Fuse(mockProjects, fuseOptions);

// Test cases
const testCases = [
    // Exact matches
    'Object Oriented Programming',
    'Test Project',
    'main.wp',

    // Fuzzy matches with typos
    'Objct',
    'algoritm',
    'projct',
    'Testt',

    // Partial matches
    'Object',
    'Test',
    'main',
    'React',

    // Case insensitive
    'object',
    'TEST',
    'MAIN',

    // Archived project searches
    'Archived',
    'Math',
    'Science',
    'Experiment',

    // No matches
    'nonexistent',
    'xyz123',
    '',

    // Special characters
    'test@',
    'test#',
    'test$'
];

function testSearch(searchTerm) {
    console.log(`\n🔍 Testing: "${searchTerm}"`);
    console.log('─'.repeat(50));

    const results = fuse.search(searchTerm);

    if (results.length === 0) {
        console.log('❌ No results found');
        return;
    }

    console.log(`✅ Found ${results.length} result(s):`);

    results.forEach((result, index) => {
        const score = result.score ? result.score.toFixed(3) : 'N/A';
        console.log(`  ${index + 1}. ${result.item.name} (score: ${score})`);

        if (result.item.files.length > 0) {
            console.log(`     Files: ${result.item.files.map(f => f.name).join(', ')}`);
        }
    });
}

function runAllTests() {
    console.log('🧪 Search Functionality Test Suite');
    console.log('='.repeat(50));
    console.log(`Testing ${testCases.length} search terms...`);

    testCases.forEach(testSearch);

    console.log('\n🎉 All tests completed!');
}

function interactiveMode() {
    console.log('🎮 Interactive Search Testing Mode');
    console.log('Type search terms to test (or "quit" to exit)');
    console.log('─'.repeat(50));

    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = () => {
        rl.question('🔍 Enter search term: ', (searchTerm) => {
            if (searchTerm.toLowerCase() === 'quit') {
                console.log('👋 Goodbye!');
                rl.close();
                return;
            }

            testSearch(searchTerm);
            askQuestion();
        });
    };

    askQuestion();
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
    interactiveMode();
} else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Search Testing Script

Usage:
  node test-search.js              # Run all test cases
  node test-search.js -i           # Interactive mode
  node test-search.js --help       # Show this help

Options:
  -i, --interactive    Run in interactive mode
  -h, --help          Show this help message
    `);
} else {
    runAllTests();
} 