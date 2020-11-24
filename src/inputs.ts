import { TranslationFileKind } from "./translation-file-kind";

export interface Inputs {
    /**
     * File glob pattern.
    */
    baseFileGlob: string;

    /**
     * Azure Cognitive Services Translator subscription key. Store as GitHub secret.
    */
    subscriptionKey: string;

    /**
     * Azure Cognitive Services Translator endpoint. Store as GitHub secret.
    */
    endpoint: string;

    /**
     * Azure Cognitive Services Translator subscription key. Store as GitHub secret.
     */
    sourceLocale: string;

    /**
     * Azure Cognitive Services Translator region. Store as GitHub secret.
     */
    region?: string;

    /**
     * An array of locales to translate to, i.e.; [ 'fr', 'de', 'es' ].
     */
    toLocales?: string[];

    /**
     * An array of resource kinds to look for, i.e.; [ 'resx', 'xliff', 'restext', 'po' ].
     */
    resourceKinds?: TranslationFileKind[];
}
