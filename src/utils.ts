export const groupBy = <T extends Record<K, string>, K extends string>
    (array: T[], key: keyof T): { [group: string]: T[] } =>
    array.reduce((result, obj) => {
        const value = obj[key];
        result[value] = [...(result[value] || []), obj];

        return result;
    }, {} as { [group: string]: T[] });