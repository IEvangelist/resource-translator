/**
 * A resource parser interface that defines common functionality for:
 * - Parsing raw file content into a well-known translation resource file.
 * - Converting a well-known translation resource file instance into its native file string representation.
*/
export interface ResourceParser {
    /**
     * Parses the file's raw content into the corresponding @type {T}
     * @return {Promise<T>}
    */
    parseFrom<T>(fileContent: string): Promise<T>,

    /**
     * Transforms the given @param {T} instance into its native
     * file string representation.
     * @returns {string}
    */
    toFileFormatted<T, TDefault extends string>(instance: T, defaultValue: TDefault): TDefault
}