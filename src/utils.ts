export const groupBy = <T extends Record<K, string>, K extends string>
    (array: T[], key: keyof T): { [group: string]: T[] } =>
    array.reduce((objectsByKeyValue, obj) => {
        const value = obj[key];
        objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);

        return objectsByKeyValue;
    }, { } as { [group: string]: T[] } );