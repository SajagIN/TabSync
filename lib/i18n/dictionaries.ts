export const DICTIONARIES = {
  en: {
    title: "TabSync Settings",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    language: "Language",
    fontSize: "Font Size",
    reset: "Reset Defaults",
    status: "Sync Status",
    peers: "Active Peers",
    transport: "Transport",
    log: "Sync Event Log",
  },
  hi: {
    title: "TabSync सेटिंग्स",
    theme: "थिम",
    light: "लाइट",
    dark: "डार्क",
    language: "भाषा",
    fontSize: "फ़ोन आकार",
    reset: "डिफ़ॉल्ट रीसेट करें",
    status: "सिंक स्थिति",
    peers: "सक्रिय साथी",
    transport: "परिवहन",
    log: "सिंक इवेंट लॉग",
  },
  ta: {
    title: "TabSync அமைப்புகள்",
    theme: "தீம்",
    light: "வெளிச்சம்",
    dark: "இருள்",
    language: "மொழி",
    fontSize: "எழுத்து அளவு",
    reset: "இயல்புநிலைக்கு மீட்டமை",
    status: "ஒத்திசைவு நிலை",
    peers: "செயலில் உள்ள தோழர்கள்",
    transport: "போக்குவரத்து",
    log: "ஒத்திசைவு நிகழ்வு பதிவு",
  },
} as const

export type Locale = keyof typeof DICTIONARIES
export type DictionaryKey = keyof (typeof DICTIONARIES)["en"]

export function getDictionary(locale: string) {
  if (locale in DICTIONARIES) {
    return DICTIONARIES[locale as Locale]
  }
  return DICTIONARIES.en
}
