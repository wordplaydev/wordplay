import { DisallowedInputs } from '@conflicts/DisallowedInputs';
import DuplicateName from '@conflicts/DuplicateName';
import DuplicateTypeVariable from '@conflicts/DuplicateTypeVariable';
import { IncompleteImplementation } from '@conflicts/IncompleteImplementation';
import NotAnInterface from '@conflicts/NotAnInterface';
import RequiredAfterOptional from '@conflicts/RequiredAfterOptional';
import { testConflict } from '@conflicts/TestUtilities';
import { UnimplementedInterface } from '@conflicts/UnimplementedInterface';
import { test } from 'vitest';
import StructureDefinition from './StructureDefinition';
import TypeVariables from './TypeVariables';

test.each([
    ['•Cat(a b)', '•Cat(a a)', StructureDefinition, DuplicateName],
    ['•Cat⸨T U⸩ ()', '•Cat⸨T T⸩ ()', TypeVariables, DuplicateTypeVariable],
    [
        '•Cat(a•# b•#:1)',
        '•Cat(a•#:1 b•#)',
        StructureDefinition,
        RequiredAfterOptional,
    ],
    [
        '•Animal() ( ƒ sound()•"" _)\n•Cat Animal() ( ƒ sound() "meow" )',
        '•Animal() ( ƒ sound()•"" _)\n•Cat Animal() ( ƒ speak() "meow" )',
        StructureDefinition,
        UnimplementedInterface,
        1,
    ],
    [
        '•Animal() ( ƒ sound()•"" _ ƒ smell() _)',
        '•Animal() ( ƒ sound()•"" _ ƒ smell() 1)',
        StructureDefinition,
        IncompleteImplementation,
        0,
    ],
    [
        '•Animal() ( ƒ sound()•"" _ ƒ smell() _)',
        '•Animal(name•"") ( ƒ sound()•"" _ ƒ smell() _)',
        StructureDefinition,
        DisallowedInputs,
        0,
    ],
    [
        // Multiple levels of interface should work
        `
        •Form() (
            ƒ die()•"" _
        )
          
        •Animal Form() (
            ƒ poop()•"" _
        )
          
        •Cat Animal() (
            ƒ die() "mew"
            ƒ poop() "ploit"
            ƒ meow() "meow"
        )
        `,
        // Multiple levels of interface should work
        `
        •Form() (
            ƒ die()•"" _
        )
          
        •Animal Form() (
            ƒ poop()•"" _
        )
          
        •Cat Animal() (
            ƒ die() "mew"
            ƒ meow() "meow"
        )
        `,
        StructureDefinition,
        UnimplementedInterface,
        2,
    ],
    // Interfaces must be structure definitions
    [
        `
        •Cat() (
            ƒ poop() _
        )
        •Boomy Cat()
        `,
        `
        •Cat() (
            ƒ poop() _
        )
        A: 5
        •Boomy A()
        `,
        StructureDefinition,
        NotAnInterface,
        1,
    ],

    // Interfaces must be interfaces
    [
        `
        •Cat() (
            ƒ poop() _
        )
        •Boomy Cat()
        `,
        `
        •Cat() (
            ƒ poop() "psssst"
        )
        •Boomy Cat()
        `,
        StructureDefinition,
        NotAnInterface,
        1,
    ],
])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    },
);
