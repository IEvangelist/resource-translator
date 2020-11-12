import { basename, dirname, resolve } from 'path';

export const groupBy = <T extends Record<K, string>, K extends string>
    (array: T[], key: keyof T): { [group: string]: T[] } =>
    array.reduce((result, obj) => {
        const value = obj[key];
        result[value] = [...(result[value] || []), obj];

        return result;
    }, {} as { [group: string]: T[] });

export const getLocaleName = (existingPath: string, locale: string) => {
    const fileName = basename(existingPath);
    const segments = fileName.split('.');
    if (segments.length === 3) {
        const newName = `${segments[0]}.${locale}.${segments[2]}`;
        const directory = dirname(existingPath);

        return resolve(directory, newName);
    }

    return null;
};

export const naturalLanguageCompare = (a: string, b: string) => {
    return !!a && !!b ? a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) : 0;
};

export function stringifyMap<T, TValue>(this: T, key: string, value: TValue) {
    const obj = this[key];
    return (obj instanceof Map)
        ? {
            dataType: 'Map',
            value: Array.from(obj.entries())
        }
        : value;
}

export function findValueByKey<T>(object: T, key: string) {
    let value: any;
    Object.keys(object).some(function (k) {
        if (k === key) {
            value = object[k];
            return true;
        }
        if (object[k] && typeof object[k] === 'object') {
            value = findValueByKey(object[k], key);
            return value !== undefined;
        }
    });
    return value;
}

export function chunk<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    let index = 0;
    while (index < array.length) {
        chunked.push(array.slice(index, size + index));
        index += size;
    }
    return chunked;
}