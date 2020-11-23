import { TranslatableTextMap } from "./translator";

/**
 * A translation file parser interface that defines common functionality for:
 * - Parsing raw file content into a well-known translation resource file.
 * - Converting a well-known translation resource file instance into its native file string representation.
*/
export interface TranslationFileParser<TParsedFile> {
    /**
     * Parses the file's raw content into the corresponding @type {TParsedFile}
     * @return {Promise<TParsedFile>}
    */
    parseFrom(fileContent: string): Promise<TParsedFile>,

    /**
     * Transforms the given @param {TParsedFile} instance into its native
     * file string representation.
     * @returns {string}
    */
    toFileFormatted(instance: TParsedFile, defaultValue: string): string

    /**
     * Applies the translations, mapping them appropriately to the
     * corresponding @type {TParsedFile} instance.
    */
    applyTranslations(
        instance: TParsedFile,
        translations: { [key: string]: string } | undefined,
        ordinals: number[] | undefined): TParsedFile;

    /**
     * Converts the given instance into a translatable text map for processing.
    */
    toTranslatableTextMap(instance: TParsedFile): TranslatableTextMap;
}