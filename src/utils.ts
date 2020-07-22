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