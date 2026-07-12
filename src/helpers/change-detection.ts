import {
  hashText,
  TranslationStateKey,
  TranslationStateLocaleSnapshot,
} from "./translation-state";

export type TranslationDecisionRule =
  | "SKIP_NO_TRANSLATE"
  | "TRANSLATE_BOOTSTRAP"
  | "TRANSLATE_TARGET_FILE_MISSING"
  | "TRANSLATE_TARGET_KEY_MISSING"
  | "TRANSLATE_STATE_MISSING"
  | "TRANSLATE_SOURCE_CHANGED"
  | "TRANSLATE_SETTINGS_CHANGED"
  | "TRANSLATE_PREVIOUSLY_FAILED"
  | "TRANSLATE_CHANGE_DETECTION_DISABLED"
  | "SNAPSHOT_BASELINE"
  | "SNAPSHOT_TARGET_FILE_MISSING"
  | "SNAPSHOT_TARGET_KEY_MISSING"
  | "REUSE_UNCHANGED"
  | "PRESERVE_MANUAL_TARGET_EDIT"
  | "REMOVE_SOURCE_DELETED";

export interface TranslationDecision {
  key: string;
  rule: TranslationDecisionRule;
}

export interface LocaleTranslationPlan {
  locale: string;
  targetPath: string;
  pendingText: Map<string, string>;
  reusedTranslations: Record<string, string>;
  decisions: TranslationDecision[];
  ruleCounts: Partial<Record<TranslationDecisionRule, number>>;
}

export interface PendingTranslationGroup {
  locales: string[];
  pendingText: Map<string, string>;
  plans: LocaleTranslationPlan[];
}

export interface PlanLocaleTranslationsArgs {
  locale: string;
  targetPath: string;
  sourceText: Map<string, string>;
  targetText: Map<string, string>;
  targetExists: boolean;
  stateLocale?: TranslationStateLocaleSnapshot;
  fingerprint: string;
  bootstrap: boolean;
  disabled: boolean;
  snapshotOnly?: boolean;
}

export const planLocaleTranslations = ({
  locale,
  targetPath,
  sourceText,
  targetText,
  targetExists,
  stateLocale,
  fingerprint,
  bootstrap,
  disabled,
  snapshotOnly = false,
}: PlanLocaleTranslationsArgs): LocaleTranslationPlan => {
  const pendingText = new Map<string, string>();
  const reusedTranslations: Record<string, string> = {};
  const decisions: TranslationDecision[] = [];
  const stateKeys = stateLocale?.keys ?? {};

  for (const key of Object.keys(stateKeys)) {
    if (!sourceText.has(key)) {
      decisions.push({ key, rule: "REMOVE_SOURCE_DELETED" });
    }
  }

  for (const [key, sourceValue] of sourceText) {
    const entry = stateKeys[key];
    const targetValue = targetText.get(key);
    const rule = getDecisionRule({
      disabled,
      bootstrap,
      targetExists,
      targetValue,
      entry,
      sourceHash: hashText(sourceValue),
      targetHash: targetValue === undefined ? undefined : hashText(targetValue),
      fingerprint,
      snapshotOnly,
    });

    decisions.push({ key, rule });

    if (isTranslateRule(rule)) {
      pendingText.set(key, sourceValue);
    } else if (
      rule === "REUSE_UNCHANGED" ||
      rule === "PRESERVE_MANUAL_TARGET_EDIT" ||
      rule === "SNAPSHOT_BASELINE"
    ) {
      reusedTranslations[key] = targetValue as string;
    }
  }

  return {
    locale,
    targetPath,
    pendingText,
    reusedTranslations,
    decisions,
    ruleCounts: countRules(decisions),
  };
};

export const groupPendingTranslationPlans = (
  plans: LocaleTranslationPlan[],
): PendingTranslationGroup[] => {
  const groups = new Map<string, PendingTranslationGroup>();

  for (const plan of plans) {
    if (!plan.pendingText.size) continue;
    const signature = [...plan.pendingText.keys()].sort().join("\u0000");
    const group = groups.get(signature);
    if (group) {
      group.locales.push(plan.locale);
      group.plans.push(plan);
    } else {
      groups.set(signature, {
        locales: [plan.locale],
        pendingText: plan.pendingText,
        plans: [plan],
      });
    }
  }

  return [...groups.values()];
};

export const createTranslationStateEntries = (
  plan: LocaleTranslationPlan,
  sourceText: Map<string, string>,
  translations: Record<string, string>,
  fingerprint: string,
): Record<string, TranslationStateKey> => {
  const entries: Record<string, TranslationStateKey> = {};

  for (const [key, sourceValue] of sourceText) {
    const translatedValue = translations[key];
    const entry: TranslationStateKey = {
      sourceHash: hashText(sourceValue),
      fingerprint,
    };
    if (typeof translatedValue === "string") {
      entry.targetHash = hashText(translatedValue);
    }
    entries[key] = entry;
  }

  return entries;
};

export const isTranslateRule = (
  rule: TranslationDecisionRule | undefined,
): boolean =>
  rule === "TRANSLATE_BOOTSTRAP" ||
  rule === "TRANSLATE_TARGET_FILE_MISSING" ||
  rule === "TRANSLATE_TARGET_KEY_MISSING" ||
  rule === "TRANSLATE_STATE_MISSING" ||
  rule === "TRANSLATE_SOURCE_CHANGED" ||
  rule === "TRANSLATE_SETTINGS_CHANGED" ||
  rule === "TRANSLATE_PREVIOUSLY_FAILED" ||
  rule === "TRANSLATE_CHANGE_DETECTION_DISABLED";

export const formatRuleCounts = (
  counts: Partial<Record<TranslationDecisionRule, number>>,
  skippedNoTranslateKeys: number,
): string => {
  const entries = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([rule, count]) => `${rule}=${count}`);

  if (skippedNoTranslateKeys > 0) {
    entries.push(`SKIP_NO_TRANSLATE=${skippedNoTranslateKeys}`);
  }

  return entries.length ? entries.join(", ") : "none";
};

const getDecisionRule = ({
  disabled,
  bootstrap,
  targetExists,
  targetValue,
  entry,
  sourceHash,
  targetHash,
  fingerprint,
  snapshotOnly,
}: {
  disabled: boolean;
  bootstrap: boolean;
  targetExists: boolean;
  targetValue: string | undefined;
  entry: TranslationStateKey | undefined;
  sourceHash: string;
  targetHash: string | undefined;
  fingerprint: string;
  snapshotOnly: boolean;
}): TranslationDecisionRule => {
  if (snapshotOnly) {
    if (!targetExists) return "SNAPSHOT_TARGET_FILE_MISSING";
    if (targetValue === undefined) return "SNAPSHOT_TARGET_KEY_MISSING";
    return "SNAPSHOT_BASELINE";
  }
  if (disabled) return "TRANSLATE_CHANGE_DETECTION_DISABLED";
  if (bootstrap) return "TRANSLATE_BOOTSTRAP";
  if (!targetExists) return "TRANSLATE_TARGET_FILE_MISSING";
  if (targetValue === undefined) return "TRANSLATE_TARGET_KEY_MISSING";
  if (!entry) return "TRANSLATE_STATE_MISSING";
  if (entry.sourceHash !== sourceHash) return "TRANSLATE_SOURCE_CHANGED";
  if (entry.fingerprint !== fingerprint) return "TRANSLATE_SETTINGS_CHANGED";
  if (entry.targetHash && targetHash && entry.targetHash !== targetHash) {
    return "PRESERVE_MANUAL_TARGET_EDIT";
  }

  return "REUSE_UNCHANGED";
};

const countRules = (
  decisions: TranslationDecision[],
): Partial<Record<TranslationDecisionRule, number>> => {
  const counts: Partial<Record<TranslationDecisionRule, number>> = {};
  for (const decision of decisions) {
    counts[decision.rule] = (counts[decision.rule] ?? 0) + 1;
  }
  return counts;
};
