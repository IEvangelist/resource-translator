import { create } from '@actions/glob';
import { context, getOctokit } from '@actions/github';
import { isDirectory } from '@actions/io/lib/io-util';
import { debug } from '@actions/core';
import { basename, resolve } from 'path';

export async function findAllResourceFiles(baseFileGlob: string): Promise<string[]> {
    const filesToInclude = await getFilesToInclude();
    const globber = await create(baseFileGlob);
    const filesAndDirectories = await globber.glob();

    const includeFile = (filepath: string) => {
        if (filesToInclude && filesToInclude.length > 0) {
            const filename = basename(filepath);
            const include = filesToInclude.some(f => f.toLowerCase() === filename.toLowerCase());
            debug(`include=${include}, ${filename}`);
            return include;
        }

        return true;
    };

    return filesAndDirectories.filter(async (path: string) => {
        const pathIsDirectory = await isDirectory(path);
        if (pathIsDirectory) {
            return false;
        }

        return includeFile(path);
    });
}
async function getFilesToInclude(): Promise<string[]> {
    try {
        // Get all files related to trigger.
        const token = process.env['GITHUB_TOKEN'] || null;
        if (token) {
            const octokit = getOctokit(token);
            const options = {
                ...context.repo,
                ref: context.ref
            };
            debug(JSON.stringify(options));
            const response = await octokit.repos.getCommit(options);

            debug(JSON.stringify(response));

            if (response.data) {
                const files = [
                    ...new Set(response.data.files.map(file => {
                        const path = resolve(__dirname, file.filename);
                        return basename(path);
                    }))
                ];

                debug(`Files from trigger: ${files.join('\n')}`);
                return files;
            }
        } else {
            debug("Unable to get the GIT_TOKEN from the environment.");
        }
    } catch (error) {
        debug(error);
    }

    return [];
}