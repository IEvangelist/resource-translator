import { debug } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { create } from "@actions/glob";
import { statSync } from "node:fs";
import { basename, normalize, resolve } from "path";
import { minimatch } from "minimatch";

export interface TranslationFileMap {
  ini?: string[] | undefined;
  po?: string[] | undefined;
  restext?: string[] | undefined;
  resx?: string[] | undefined;
  xliff?: string[] | undefined;
  json?: string[] | undefined;
}

export interface FindOptions {
  /** Glob patterns of files to include. Empty = include all matched. */
  include?: string[];
  /** Glob patterns of files to exclude. Applied after include. */
  exclude?: string[];
}

const translationFileSchemes = {
  ini: (locale: string) => `**/*.${locale}.ini`,
  // PO files conventionally are named after the LOCALE itself (`en.po`,
  // `fr.po`) rather than the resx-style `<basename>.<locale>.<ext>`. We
  // therefore have to match three layouts:
  //   1. exact `<locale>.po` (e.g. `en.po`, `messages/en.po`)
  //   2. `*.<locale>.po`     (e.g. `messages.en.po`)
  //   3. gettext             (e.g. `<locale>/LC_MESSAGES/<domain>.po`)
  // Without this guard, `**/*.po` would also pick up the previous run's
  // OUTPUT files (`fr.po`, `de.po`, ...) and feed them back as inputs on
  // the next run — translating Spanish ➝ Spanish is silly at best and
  // corrupts target files at worst.
  po: (locale: string) => [
    `**/${locale}.po`,
    `**/*.${locale}.po`,
    `**/${locale}/LC_MESSAGES/*.po`,
  ],
  restext: (locale: string) => `**/*.${locale}.restext`,
  resx: (locale: string) => `**/*.${locale}.resx`,
  xliff: (locale: string) => `**/*.${locale}.xliff`,
  json: (locale: string) => `**/*.${locale}.json`,
};

const isDirectorySafe = (path: string): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Returns true when `filePath` matches any pattern in `patterns`. The match is
 * tried against both the absolute path and the workspace-relative path so users
 * can provide patterns like `src/**` without worrying about runner cwd.
 */
const matchesAny = (filePath: string, patterns: string[]): boolean => {
  if (!patterns.length) return false;
  const cwd = process.cwd();
  const relative = filePath.startsWith(cwd)
    ? filePath.slice(cwd.length).replace(/^[\\/]+/, "")
    : filePath;
  return patterns.some(
    (p) =>
      minimatch(filePath, p, { dot: true, matchBase: true }) ||
      minimatch(relative, p, { dot: true, matchBase: true }),
  );
};

export async function findAllTranslationFiles(
  sourceLocale: string,
  options: FindOptions = {},
): Promise<TranslationFileMap> {
  const filesToInclude = await getFilesToInclude();
  const includeFile = (filepath: string) => {
    if (filesToInclude && filesToInclude.length > 0) {
      const filename = basename(filepath);
      const include = filesToInclude.some(
        (f) => f.toLowerCase() === filename.toLowerCase(),
      );
      debug(`include=${include}, ${filename}`);
      return include;
    }

    return true;
  };

  const patterns = Object.values(translationFileSchemes).flatMap(
    (fileScheme) => {
      if (typeof fileScheme === "function") {
        const result = fileScheme(sourceLocale);
        return Array.isArray(result) ? result : [result];
      }
      return [fileScheme];
    },
  );

  const globber = await create(patterns.join("\n"));
  const filesAndDirectories = await globber.glob();
  const include = options.include ?? [];
  const exclude = options.exclude ?? [];
  const promises = filesAndDirectories.map(async (path) => {
    return {
      path: normalize(path),
      isDirectory: isDirectorySafe(path),
      include: includeFile(path),
    };
  });
  const files = await Promise.all(promises);
  const results = files
    .filter((file) => file.include && !file.isDirectory)
    .map((file) => file.path)
    .filter((path) => (include.length ? matchesAny(path, include) : true))
    .filter((path) => !matchesAny(path, exclude));

  debug(`Files to translate:\n\t${results.join("\n\t")}`);

  return {
    po: results.filter((f) => f.endsWith(".po")),
    restext: results.filter((f) => f.endsWith(".restext")),
    ini: results.filter((f) => f.endsWith(".ini")),
    resx: results.filter((f) => f.endsWith(".resx")),
    xliff: results.filter((f) => f.endsWith(".xliff")),
    json: results.filter((f) => f.endsWith(".json")),
  };
}

async function getFilesToInclude(): Promise<string[]> {
  try {
    // Get all files related to trigger.
    const token = process.env["GITHUB_TOKEN"] || null;
    if (token) {
      const octokit = getOctokit(token);
      const options = {
        ...context.repo,
        ref: context.ref,
      };
      debug(JSON.stringify(options));

      const response = await octokit.rest.repos.getCommit(options);

      debug(JSON.stringify(response));

      if (response.data && response.data.files) {
        const files: string[] = [
          ...new Set(
            (response.data.files as Array<{ filename: string }>).map((file) => {
              const path = resolve(__dirname, file.filename);
              return basename(path);
            }),
          ),
        ];

        debug(`Files from trigger:\n\t${files.join("\n\t")}`);
        return files;
      }
    } else {
      debug("Unable to get the GITHUB_TOKEN from the environment.");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      debug(error.message);
    } else {
      debug(`Unknown error: ${error}.`);
    }
  }

  return [];
}
