// baseFileGlob:    **/*.en.resx
// subscriptionKey: c57xxxxxxxxxxxxxxxxxxxxxxxxxxac3
// endpoint:        https://api.cognitive.microsofttranslator.com/

//  This looks interesting: https://github.com/ryanluton/translate-resx/blob/master/translate-resx.js

/**
 * WORKFLOW
 * 
 * Determine if 'baseFileGlob' files match files that were changed in the current contextual PR
 *    If not, nop... cleanly exit
 * 
 * Get input/validate 'subscriptionKey' and 'endpoint' or exit
 * Get resource files based on 'baseFileGlob' from source
 * For each resource file:
 *    Parse XML, translate each key/value pair, write out resulting translations
 * Create PR based on newly created translation files * 
 */

import { getInput, setOutput, setFailed } from '@actions/core';
import { context } from '@actions/github';
import { getAvailableTranslations, translate } from './api';
import { uuid } from 'uuidv4';
import { findAllResourceFiles } from './resource-finder';
import { readFile } from './resource-io';
import { getTranslatableText } from './translator';
import { groupBy } from './utils';

interface Options {
    baseFileGlob: string;
    subscriptionKey: string;
    endpoint: string;
}

const getOptions = (): Options => {
    const [baseFileGlob, endpoint, subscriptionKey] = [
        getInput('baseFileGlob') || '**/*.en.resx',
        getInput('endpoint', { required: true }),
        getInput('subscriptionKey', { required: true }),
    ];

    return {
        baseFileGlob, subscriptionKey, endpoint
    }
};

export async function initiate() {
    try {
        const inputOptions = getOptions();
        if (!inputOptions) {
            setFailed('Both a subscriptionKey and endpoint are required.');
        } else {
            const availableTranslations = await getAvailableTranslations();
            if (!availableTranslations || !availableTranslations.translation) {
                console.error("Unable to get target translations.");
                return;
            }

            const to = Object.keys(availableTranslations.translation);
            console.log(`Detected translation targets to: ${to.join(", ")}`);
            const resourceFiles = await findAllResourceFiles(inputOptions.baseFileGlob);
            if (!resourceFiles || !resourceFiles.length) {
                console.error("Unable to get target resource files.");
                return;
            }

            console.log(`Discovered target resource files: ${resourceFiles.join(", ")}`);
            for (let resourceFile in resourceFiles) {
                const resourceXml = await readFile(resourceFile);
                const translatableText = await getTranslatableText(resourceXml);
                if (translatableText) {
                    const toLocales  =
                        Object.keys(availableTranslations.translation);
                    const result = await translate(
                        inputOptions.endpoint,
                        inputOptions.subscriptionKey,
                        toLocales,
                        translatableText);

                    if (result && result.translations) {
                        const grouped = groupBy(
                            result.translations,
                            'to'
                        )
                            
                    }
                }
            }

            let requestOptions = {
                method: 'POST',
                baseUrl: inputOptions.endpoint,
                url: 'translate',
                qs: {
                    'api-version': '3.0',
                    'to': ['de', 'it']
                },
                headers: {
                    'Ocp-Apim-Subscription-Key': inputOptions.subscriptionKey,
                    'Content-type': 'application/json',
                    'X-ClientTraceId': uuid().toString()
                },
                body: [
                    {
                        'text': 'Hello World!'
                    }
                ],
                json: true,
            };

            // await request(options, function (err, res, body) {
            //     console.log(JSON.stringify(body, null, 4));
            // });
        }
    } catch (error) {
        setFailed(error.message);
    }
}