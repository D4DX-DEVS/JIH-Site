// Malayalam for the short labels WordPress only had in English: menu items, section page titles,
// categories, leader roles and the organisation's settings. Without them the Malayalam site's header,
// breadcrumbs and listings fall back to English (and, for the few Malayalam-only menu items, English for
// the English menu). Applied only where the field is empty, so an
// editor's text always wins; editors change them in the admin like any other field.
// Articles and page bodies are not translated here: those stay with the editors.

/** English label → Malayalam, for menu items. */
export const NAV_LABELS: Record<string, string> = {
  Home: "ഹോം",
  About: "ഞങ്ങളെക്കുറിച്ച്",
  "About Us": "ഞങ്ങളെക്കുറിച്ച്",
  History: "ചരിത്രം",
  Ideology: "ആദർശം",
  Objectives: "ലക്ഷ്യം",
  Constitution: "ഭരണഘടന",
  "Feeder Organisation": "പോഷക സംഘടനകൾ",
  Departments: "വകുപ്പുകൾ",
  // Shorter than the section title (മാധ്യമങ്ങളും പ്രസിദ്ധീകരണങ്ങളും) so the menu fits on a laptop screen.
  "Media and Publications": "പ്രസിദ്ധീകരണങ്ങൾ",
  Leaders: "നേതൃത്വം",
  News: "വാർത്തകൾ",
  Gallery: "ഗാലറി",
  Downloads: "ഡൗൺലോഡുകൾ",
  Contact: "ബന്ധപ്പെടുക",
};

/** Malayalam label → English, for the menu items WordPress had only in Malayalam (the forms under Downloads). */
export const NAV_LABELS_EN: Record<string, string> = {
  "മസ്ജിദ് ഫണ്ട്": "Masjid Fund",
  "ഇമാം മുഅദ്ദിന്‍ ക്ഷേമനിധിയിലേക്കുള്ള അപേക്ഷ": "Imam and Muezzin Welfare Fund Application",
  "മസ്ജിദ് അഫിലിയേഷനുള്ള അപേക്ഷ": "Masjid Affiliation Application",
};

/** Page slug → Malayalam title, for the section pages (hubs, listings, contact) and the history page. */
export const PAGE_TITLES: Record<string, string> = {
  contact: "ബന്ധപ്പെടുക",
  "about-us": "ഞങ്ങളെക്കുറിച്ച്",
  leaders: "നേതൃത്വം",
  news: "വാർത്തകൾ",
  departments: "വകുപ്പുകൾ",
  "media-and-publications": "മാധ്യമങ്ങളും പ്രസിദ്ധീകരണങ്ങളും",
  history: "ചരിത്രം",
  "feeder-organisation": "പോഷക സംഘടനകൾ",
  "madhyamam-daily": "മാധ്യമം ദിനപത്രം",
};

/** Category slug → Malayalam name (post categories and gallery categories). */
export const CATEGORY_NAMES: Record<string, string> = {
  uncategorized: "മറ്റുള്ളവ",
  "state-news": "സംസ്ഥാന വാർത്തകൾ",
  "district-news": "ജില്ലാ വാർത്തകൾ",
  articles: "ലേഖനങ്ങൾ",
  interviews: "അഭിമുഖങ്ങൾ",
  "ameer-updates": "അമീറിന്റെ അപ്ഡേറ്റുകൾ",
  kozhikode: "കോഴിക്കോട്",
  malappuram: "മലപ്പുറം",
  eranakulam: "എറണാകുളം",
  alappuzha: "ആലപ്പുഴ",
  kollam: "കൊല്ലം",
  idukki: "ഇടുക്കി",
  kannur: "കണ്ണൂർ",
  wayanad: "വയനാട്",
  kottayam: "കോട്ടയം",
  "new-gallery": "പുതിയ ഗാലറി",
  "archive-gallery": "പഴയ ചിത്രങ്ങൾ",
};

/** English role → Malayalam, for leaders. */
export const LEADER_ROLES: Record<string, string> = {
  Ameer: "അമീർ",
  "Assistant Ameer": "അസിസ്റ്റന്റ് അമീർ",
  "General Secretary": "ജനറൽ സെക്രട്ടറി",
  Secretary: "സെക്രട്ടറി",
  "Shoora Member": "ശൂറാ അംഗം",
};

/** Settings group → field → Malayalam (the English stays in the field's `…En` twin). */
export const SETTINGS: Record<string, Record<string, string>> = {
  site: {
    name: "ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് കേരള",
    shortName: "ജമാഅത്തെ ഇസ്‌ലാമി കേരള",
    tagline: "ദൈവേച്ഛക്ക് വിധേയമായ ജീവിതരീതി ഉയർത്തിപ്പിടിക്കാൻ ലക്ഷ്യമിടുന്ന ഇന്ത്യയിലെ സാമൂഹിക-മത പ്രസ്ഥാനമാണ് ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ്.",
  },
  seo: {
    homeTitle: "ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് കേരള | JIH Kerala",
    defaultDescription: "ദൈവേച്ഛക്ക് വിധേയമായ ജീവിതരീതി ഉയർത്തിപ്പിടിക്കാൻ ലക്ഷ്യമിടുന്ന ഇന്ത്യയിലെ സാമൂഹിക-മത പ്രസ്ഥാനമാണ് ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ് കേരള.",
  },
  contact: {
    organisation: "ജമാഅത്തെ ഇസ്‌ലാമി ഹിന്ദ്, കേരള",
    postBox: "പി.ബി. നമ്പർ: 833",
    address: "ഹിറാ സെന്റർ, മാവൂർ റോഡ്, കോഴിക്കോട് - 673004",
  },
};
