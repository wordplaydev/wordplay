import { expect, test } from 'vitest';
import { rumbleGamepads } from '@output/Music/rumble';

const rumble = { strong: 1, weak: 0.5, duration: 100 };

type Motors = Pick<GamepadHapticActuator, 'playEffect'>;

const pad = (vibrationActuator: Motors | null) => ({ vibrationActuator });

test('rumbles pads with motors and skips the rest', () => {
    const played: unknown[] = [];
    const motors: Motors = {
        playEffect: (type, params) => {
            played.push([type, params]);
            return Promise.resolve('complete');
        },
    };
    rumbleGamepads(rumble, [null, pad(null), pad(motors)]);
    expect(played).toEqual([
        [
            'dual-rumble',
            { duration: 100, strongMagnitude: 1, weakMagnitude: 0.5 },
        ],
    ]);
});

test('a preempted effect is not a failure', async () => {
    const rejected = Promise.reject(new Error('preempted'));
    rumbleGamepads(rumble, [pad({ playEffect: () => rejected })]);
    await expect(rejected).rejects.toThrow();
});
