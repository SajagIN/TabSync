export function HeadBootstrap() {
  const script = `
(function() {
  try {
    var themeReg = localStorage.getItem('tabsync:v1:register:theme');
    var langReg = localStorage.getItem('tabsync:v1:register:language');
    var fontReg = localStorage.getItem('tabsync:v1:register:fontSize');

    if (themeReg) {
      var parsed = JSON.parse(themeReg);
      if (parsed && parsed.value === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }

    if (langReg) {
      var parsedLang = JSON.parse(langReg);
      if (parsedLang && parsedLang.value) {
        document.documentElement.setAttribute('lang', parsedLang.value);
      }
    }

    if (fontReg) {
      var parsedFont = JSON.parse(fontReg);
      if (parsedFont && typeof parsedFont.value === 'number') {
        document.documentElement.style.setProperty('--tabsync-font-size', parsedFont.value + 'px');
      }
    }
  } catch (e) {}
})();
  `.trim()

  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />
}
