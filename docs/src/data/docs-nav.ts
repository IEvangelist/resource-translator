export type DocLink = {
  href: string;
  label: string;
  icon?: string;
};

export type DocSection = {
  title: string;
  icon: string;
  items: DocLink[];
};

export const sections: DocSection[] = [
  {
    title: "Start here",
    icon: "lucide:rocket",
    items: [
      { href: "/", label: "Overview", icon: "lucide:sparkles" },
      { href: "/getting-started", label: "Getting started", icon: "lucide:zap" },
      { href: "/configuration", label: "Configuration", icon: "lucide:settings-2" },
    ],
  },
  {
    title: "Reference",
    icon: "lucide:code-2",
    items: [
      { href: "/inputs", label: "Inputs & outputs", icon: "lucide:file-text" },
      { href: "/formats", label: "File formats", icon: "lucide:package" },
      { href: "/recipes", label: "Recipes", icon: "lucide:wand-sparkles" },
      { href: "/faq", label: "FAQ", icon: "lucide:circle-help" },
    ],
  },
  {
    title: "Showcase",
    icon: "lucide:sparkles",
    items: [
      { href: "/translations", label: "Translations", icon: "lucide:languages" },
    ],
  },
  {
    title: "Project",
    icon: "lucide:folder-git-2",
    items: [
      { href: "/contributing", label: "Contributing", icon: "lucide:hand-heart" },
      { href: "/changelog", label: "Changelog", icon: "lucide:history" },
    ],
  },
];

export const flatNav: DocLink[] = sections.flatMap((s) => s.items);
