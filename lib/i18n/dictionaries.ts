import type { Language } from "@/lib/tabsync/types"

export interface Messages {
  product: string
  eyebrow: string
  headline: string
  description: string
  controlsSection: string
  previewSection: string
  live: string
  footerDescription: string
  footerNote: string
  openTab: string
  settingsTitle: string
  settingsDescription: string
  themeTitle: string
  themeHelp: string
  light: string
  dark: string
  languageTitle: string
  languageHelp: string
  fontTitle: string
  fontHelp: string
  fontUnit: string
  previewTitle: string
  previewLabel: string
  previewHeading: string
  previewBody: string
  previewTheme: string
  previewLanguage: string
  previewFontSize: string
  statusTitle: string
  transport: string
  persistence: string
  peers: string
  connected: string
  noPeers: string
  saved: string
  degraded: string
  degradedCopy: string
  unavailableCopy: string
  storageTransport: string
  noTransport: string
  reset: string
  debugTitle: string
  debugOpen: string
  debugState: string
  debugVersions: string
  debugLog: string
  debugActor: string
  debugField: string
  debugClock: string
  debugDirection: string
  debugSent: string
  debugReceived: string
  debugRestoredDirection: string
  debugNoUpdate: string
  debugLatency: string
  debugRestored: string
  debugSkipped: string
  debugCopy: string
  debugCopied: string
  debugEmpty: string
  debugLocal: string
  debugRemote: string
  debugRejected: string
  debugMerge: string
  debugLifecycle: string
  useStorage: string
  useBroadcast: string
  currentValue: string
  close: string
}

const en: Messages = {
  product: "TabSync",
  eyebrow: "A small, observable sync demo",
  headline: "One preference. Every tab.",
  description: "Change a setting here and watch every open TabSync window follow.",
  controlsSection: "01 / CONTROLS",
  previewSection: "02 / REFLECTION",
  live: "LIVE",
  footerDescription: "Browser-local, tab-wide preferences",
  footerNote: "Changes are versioned and saved immediately.",
  openTab: "Open another tab",
  settingsTitle: "Preferences",
  settingsDescription: "Your choices are saved in this browser and shared across tabs.",
  themeTitle: "Appearance",
  themeHelp: "Choose a light or dark surface for every open tab.",
  light: "Light",
  dark: "Dark",
  languageTitle: "Language",
  languageHelp: "The interface updates in every open tab.",
  fontTitle: "Preview text size",
  fontHelp: "Adjusts the sample below, not the controls.",
  fontUnit: "pixels",
  previewTitle: "Live preview",
  previewLabel: "A real-time reflection of your preferences",
  previewHeading: "A calmer way to stay in sync.",
  previewBody:
    "This sample changes language, theme, and type size as soon as a preference is updated in any tab.",
  previewTheme: "Theme",
  previewLanguage: "Language",
  previewFontSize: "Text size",
  statusTitle: "Connection",
  transport: "Transport",
  persistence: "Saving",
  peers: "Other tabs",
  connected: "Live sync ready",
  noPeers: "Open another tab to test sync",
  saved: "Saved in this browser",
  degraded: "Not saved",
  degradedCopy: "Changes are not being saved in this browser. Other open tabs may still sync.",
  unavailableCopy:
    "Sync and saving are unavailable in this browser. Your changes stay in this tab.",
  storageTransport: "Live sync is using the storage fallback.",
  noTransport: "Live sync is unavailable in this browser.",
  reset: "Reset preferences",
  debugTitle: "Diagnostics",
  debugOpen: "Show diagnostics",
  debugState: "State",
  debugVersions: "Versions",
  debugLog: "Event log",
  debugActor: "This tab",
  debugField: "Field",
  debugClock: "Wall time · counter · actor",
  debugDirection: "Last direction · latency",
  debugSent: "Sent from this tab",
  debugReceived: "Received from another tab",
  debugRestoredDirection: "Restored from browser storage",
  debugNoUpdate: "No update yet",
  debugLatency: "Last remote latency",
  debugRestored: "records restored",
  debugSkipped: "skipped",
  debugCopy: "Copy state",
  debugCopied: "Copied",
  debugEmpty: "No sync events yet.",
  debugLocal: "Local change",
  debugRemote: "Received from another tab",
  debugRejected: "Rejected record",
  debugMerge: "Conflict checked",
  debugLifecycle: "Connection event",
  useStorage: "Use storage fallback",
  useBroadcast: "Use BroadcastChannel",
  currentValue: "Current value",
  close: "Close diagnostics",
}

const hi: Messages = {
  product: "TabSync",
  eyebrow: "सिंक का एक सरल और स्पष्ट डेमो",
  headline: "एक पसंद। हर टैब में।",
  description: "यहाँ सेटिंग बदलें और खुले TabSync टैब में बदलाव देखें।",
  controlsSection: "01 / नियंत्रण",
  previewSection: "02 / झलक",
  live: "लाइव",
  footerDescription: "ब्राउज़र में सहेजी जाने वाली, सभी टैब की पसंद",
  footerNote: "बदलाव तुरंत संस्करण सहित सहेजे जाते हैं।",
  openTab: "दूसरा टैब खोलें",
  settingsTitle: "पसंद",
  settingsDescription: "आपकी पसंद इस ब्राउज़र में सहेजी जाती है और टैब में साझा होती है।",
  themeTitle: "रूप-रंग",
  themeHelp: "सभी खुले टैब के लिए हल्का या गहरा रूप चुनें।",
  light: "हल्का",
  dark: "गहरा",
  languageTitle: "भाषा",
  languageHelp: "सभी खुले टैब में इंटरफ़ेस बदल जाएगा।",
  fontTitle: "पूर्वावलोकन का अक्षर आकार",
  fontHelp: "नीचे के नमूने का आकार बदलता है, नियंत्रणों का नहीं।",
  fontUnit: "पिक्सेल",
  previewTitle: "लाइव पूर्वावलोकन",
  previewLabel: "आपकी पसंद का तुरंत प्रतिबिंब",
  previewHeading: "सिंक में रहने का एक सरल तरीका।",
  previewBody: "किसी भी टैब में पसंद बदलते ही यह नमूना भाषा, रंग और अक्षर आकार बदलता है।",
  previewTheme: "रूप",
  previewLanguage: "भाषा",
  previewFontSize: "अक्षर आकार",
  statusTitle: "कनेक्शन",
  transport: "सिंक माध्यम",
  persistence: "सहेजना",
  peers: "अन्य टैब",
  connected: "लाइव सिंक तैयार",
  noPeers: "सिंक जाँचने के लिए दूसरा टैब खोलें",
  saved: "इस ब्राउज़र में सहेजा गया",
  degraded: "सहेजा नहीं गया",
  degradedCopy: "इस ब्राउज़र में बदलाव सहेजे नहीं जा रहे हैं। खुले टैब फिर भी सिंक हो सकते हैं।",
  unavailableCopy: "इस ब्राउज़र में सिंक और सहेजना उपलब्ध नहीं है। बदलाव केवल इसी टैब में रहेंगे।",
  storageTransport: "लाइव सिंक स्टोरेज फ़ॉलबैक का उपयोग कर रहा है।",
  noTransport: "इस ब्राउज़र में लाइव सिंक उपलब्ध नहीं है।",
  reset: "पसंद रीसेट करें",
  debugTitle: "निदान",
  debugOpen: "निदान दिखाएँ",
  debugState: "स्थिति",
  debugVersions: "संस्करण",
  debugLog: "घटना लॉग",
  debugActor: "यह टैब",
  debugField: "फ़ील्ड",
  debugClock: "समय · काउंटर · पहचान",
  debugDirection: "अंतिम दिशा · विलंब",
  debugSent: "इस टैब से भेजा",
  debugReceived: "दूसरे टैब से मिला",
  debugRestoredDirection: "ब्राउज़र स्टोरेज से बहाल",
  debugNoUpdate: "अभी कोई बदलाव नहीं",
  debugLatency: "अंतिम दूरस्थ विलंब",
  debugRestored: "रिकॉर्ड बहाल",
  debugSkipped: "छोड़े गए",
  debugCopy: "स्थिति कॉपी करें",
  debugCopied: "कॉपी किया गया",
  debugEmpty: "अभी तक कोई सिंक घटना नहीं।",
  debugLocal: "स्थानीय बदलाव",
  debugRemote: "दूसरे टैब से प्राप्त",
  debugRejected: "अस्वीकृत रिकॉर्ड",
  debugMerge: "टकराव जाँचा गया",
  debugLifecycle: "कनेक्शन घटना",
  useStorage: "स्टोरेज फ़ॉलबैक अपनाएँ",
  useBroadcast: "BroadcastChannel अपनाएँ",
  currentValue: "वर्तमान मान",
  close: "निदान बंद करें",
}

const ta: Messages = {
  product: "TabSync",
  eyebrow: "ஒத்திசைவைக் காண்பிக்கும் எளிய விளக்கம்",
  headline: "ஒரு விருப்பம். எல்லா தாவல்களிலும்.",
  description: "இங்கே அமைப்பை மாற்றி, திறந்துள்ள TabSync தாவல்களில் காணுங்கள்.",
  controlsSection: "01 / கட்டுப்பாடுகள்",
  previewSection: "02 / முன்னோட்டம்",
  live: "நேரலை",
  footerDescription: "உலாவியில் சேமிக்கப்படும், எல்லாத் தாவல்களுக்குமான விருப்பங்கள்",
  footerNote: "மாற்றங்கள் பதிப்புடன் உடனடியாகச் சேமிக்கப்படும்.",
  openTab: "மற்றொரு தாவலைத் திறக்கவும்",
  settingsTitle: "விருப்பங்கள்",
  settingsDescription:
    "உங்கள் விருப்பங்கள் இந்த உலாவியில் சேமிக்கப்பட்டு தாவல்களிடையே பகிரப்படும்.",
  themeTitle: "தோற்றம்",
  themeHelp: "திறந்துள்ள எல்லா தாவல்களுக்கும் ஒளி அல்லது இருண்ட தோற்றத்தைத் தேர்ந்தெடுக்கவும்.",
  light: "ஒளி",
  dark: "இருள்",
  languageTitle: "மொழி",
  languageHelp: "திறந்துள்ள எல்லா தாவல்களிலும் இடைமுகம் மாறும்.",
  fontTitle: "முன்னோட்ட எழுத்தளவு",
  fontHelp: "கீழே உள்ள மாதிரியை மட்டும் மாற்றும்; கட்டுப்பாடுகளை அல்ல.",
  fontUnit: "பிக்சல்கள்",
  previewTitle: "நேரடி முன்னோட்டம்",
  previewLabel: "உங்கள் விருப்பங்களின் உடனடி பிரதிபலிப்பு",
  previewHeading: "ஒத்திசைவில் இருக்க எளிய வழி.",
  previewBody:
    "எந்தத் தாவலிலும் விருப்பத்தை மாற்றினால், இந்த மாதிரி மொழி, தோற்றம், எழுத்தளவை உடனே மாற்றும்.",
  previewTheme: "தோற்றம்",
  previewLanguage: "மொழி",
  previewFontSize: "எழுத்தளவு",
  statusTitle: "இணைப்பு",
  transport: "ஒத்திசைவு முறை",
  persistence: "சேமிப்பு",
  peers: "மற்ற தாவல்கள்",
  connected: "நேரடி ஒத்திசைவு தயார்",
  noPeers: "ஒத்திசைவைச் சோதிக்க மற்றொரு தாவலைத் திறக்கவும்",
  saved: "இந்த உலாவியில் சேமிக்கப்பட்டது",
  degraded: "சேமிக்கப்படவில்லை",
  degradedCopy:
    "இந்த உலாவியில் மாற்றங்கள் சேமிக்கப்படவில்லை. திறந்த தாவல்கள் இன்னும் ஒத்திசைக்கலாம்.",
  unavailableCopy:
    "இந்த உலாவியில் ஒத்திசைவும் சேமிப்பும் கிடைக்கவில்லை. மாற்றங்கள் இந்தத் தாவலில் மட்டுமே இருக்கும்.",
  storageTransport: "நேரடி ஒத்திசைவு சேமிப்பக மாற்று முறையைப் பயன்படுத்துகிறது.",
  noTransport: "இந்த உலாவியில் நேரடி ஒத்திசைவு கிடைக்கவில்லை.",
  reset: "விருப்பங்களை மீட்டமைக்கவும்",
  debugTitle: "கண்டறிதல்கள்",
  debugOpen: "கண்டறிதல்களைக் காட்டு",
  debugState: "நிலை",
  debugVersions: "பதிப்புகள்",
  debugLog: "நிகழ்வு பதிவு",
  debugActor: "இந்தத் தாவல்",
  debugField: "புலம்",
  debugClock: "நேரம் · எண்ணி · அடையாளம்",
  debugDirection: "கடைசித் திசை · தாமதம்",
  debugSent: "இந்தத் தாவலிலிருந்து அனுப்பப்பட்டது",
  debugReceived: "மற்றொரு தாவலிலிருந்து பெறப்பட்டது",
  debugRestoredDirection: "உலாவி சேமிப்பகத்திலிருந்து மீட்டெடுக்கப்பட்டது",
  debugNoUpdate: "இன்னும் மாற்றம் இல்லை",
  debugLatency: "கடைசி தொலைநிலைத் தாமதம்",
  debugRestored: "பதிவுகள் மீட்டெடுக்கப்பட்டன",
  debugSkipped: "தவிர்க்கப்பட்டன",
  debugCopy: "நிலையை நகலெடு",
  debugCopied: "நகலெடுக்கப்பட்டது",
  debugEmpty: "ஒத்திசைவு நிகழ்வுகள் இன்னும் இல்லை.",
  debugLocal: "உள்ளூர் மாற்றம்",
  debugRemote: "மற்றொரு தாவலிலிருந்து பெறப்பட்டது",
  debugRejected: "நிராகரிக்கப்பட்ட பதிவு",
  debugMerge: "முரண்பாடு சரிபார்க்கப்பட்டது",
  debugLifecycle: "இணைப்பு நிகழ்வு",
  useStorage: "சேமிப்பக மாற்று முறையைப் பயன்படுத்து",
  useBroadcast: "BroadcastChannel-ஐப் பயன்படுத்து",
  currentValue: "தற்போதைய மதிப்பு",
  close: "கண்டறிதல்களை மூடு",
}

const dictionaries: Record<Language, Messages> = { en, hi, ta }

export function getDictionary(language: Language): Messages {
  return dictionaries[language]
}
