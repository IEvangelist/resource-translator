import { groupBy } from '../src/utils';
import { DetectedLanguage, Result, TranslationResult } from '../src/translation-results';

test("UTILS: group by functions correctly", () => {
    const cars = [
        { brand: 'Audi', color: 'black' },
        { brand: 'Ferrari', color: 'red' },
        { brand: 'Ford', color: 'white' },
        { brand: 'Toyota', color: 'white' },
        { brand: 'Audi', color: 'white' },
    ];

    const audiCars = groupBy(cars, 'brand');
    expect(audiCars).toEqual({
        'Audi': [
            { brand: 'Audi', color: 'black' },
            { brand: 'Audi', color: 'white' }
        ],
        'Ferrari': [
            { brand: 'Ferrari', color: 'red' }
        ],
        'Ford': [
            { brand: 'Ford', color: 'white' }
        ],
        'Toyota': [
            { brand: 'Toyota', color: 'white' }
        ]
    });
});

test('UTILS: group by functions correctly with translation results', () => {
    const result: TranslationResult = {
        detectedLanguage: {
            language: 'en',
            score: 1.0
        } as DetectedLanguage,
        translations: [
            { to: 'fr', text: 'salut comment allez-vous?' },
            { to: 'fr', text: 'Je vous remercie' },
            { to: 'es', text: 'Te deseo todo lo mejor' },
            { to: 'fr', text: `Jusqu'à notre prochaine rencontre, prenez soin de vous` },
            { to: 'bg', text: 'Сламен танц, дефтони!' }
        ] as Result[]
    };

    const grouped = groupBy(result.translations, 'to');
    expect(grouped).toEqual({
        'fr': [
            { to: 'fr', text: 'salut comment allez-vous?' },
            { to: 'fr', text: 'Je vous remercie' },
            { to: 'fr', text: `Jusqu'à notre prochaine rencontre, prenez soin de vous` }
        ],
        'es': [
            { to: 'es', text: 'Te deseo todo lo mejor' }
        ],
        'bg': [
            { to: 'bg', text: 'Сламен танц, дефтони!' }
        ]
    });
});