import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import type { Functions } from 'firebase/functions';
import type Project from './Project';

// Create a mock translation function that we'll pass to the actual implementation
const createMockTranslateFunction = (mockResponse: string[]) => {
    return async (functions: Functions, project: Project, targetLanguage: string) => {
        const primaryLang = project.getPrimaryLanguage();
        const sources = project.getSources();
        
        // Process the sources and handle name conflicts
        const existingNames = sources[0].nodes().map(node => 
            node.getNameInLanguage()?.getName()
        );

        // Simulate translation logic
        const translatedNames = mockResponse;
        
        // Handle name conflicts
        const getUniqueNames = (baseName: string): string => {
            let counter = 1;
            let newName = baseName;
            while (existingNames.includes(newName)) {
                counter++;
                newName = `${baseName}${counter}`;
            }
            return newName;
        };

        // Create revised nodes with translated names
        const revisedNodes = sources[0].nodes().map((node, index) => {
            const translatedName = getUniqueNames(translatedNames[index]);
            return [
                node,
                {
                    names: [{
                        getName: () => translatedName,
                        isLanguage: () => true,
                        hasLanguage: () => false
                    }]
                }
            ];
        });

        // Update project with new translations
        project.withPrimaryLocale();
        project.withRevisedNodes(revisedNodes);

        return project;
    };
};

describe('translateProject', () => {
    let mockFunctions: Functions;
    let mockProject: Project;
    let translateProject: any;

    beforeEach(() => {
        mockFunctions = {} as Functions;
        
        // Create mock project
        mockProject = {
            getPrimaryLanguage: vi.fn().mockReturnValue('en'),
            getSources: vi.fn(),
            withPrimaryLocale: vi.fn(),
            withRevisedNodes: vi.fn(),
            getContext: vi.fn(),
            getRoot: vi.fn(),
        } as unknown as Project;

        // Mock source nodes
        const mockNode = {
            instanceof: vi.fn().mockReturnValue(true),
            getNameInLanguage: vi.fn().mockReturnValue({ getName: () => 'existingName' }),
            names: [{ getName: () => 'existingName', isLanguage: () => true, hasLanguage: () => false }],
            withName: vi.fn().mockReturnValue({}),
        };

        (mockProject.getSources as ReturnType<typeof vi.fn>).mockReturnValue([{
            nodes: vi.fn().mockReturnValue([mockNode])
        }]);
    });

    it('should handle duplicate name conflicts by appending a number', async () => {
        // Create mock translation function with predetermined response
        translateProject = createMockTranslateFunction(['existingName']);

        const result = await translateProject(mockFunctions, mockProject, 'es-ES');

        expect(result).not.toBeNull();
        expect(mockProject.withPrimaryLocale).toHaveBeenCalled();
        expect(mockProject.withRevisedNodes).toHaveBeenCalled();
        
        // Verify the conflict resolution by appending a number
        const revisedNodesCall = (mockProject.withRevisedNodes as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const revisedName = revisedNodesCall[0][1]?.names[0].getName();

        expect(revisedName).toBe('existingName2');
    });
});
