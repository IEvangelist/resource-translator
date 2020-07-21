import { groupBy } from '../src/utils';

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