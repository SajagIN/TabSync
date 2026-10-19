import { ArrowUpRight, Check } from "lucide-react"
import type { SettingsState } from "@/lib/tabsync/types"
import type { Messages } from "@/lib/i18n/dictionaries"

interface PreviewPanelProps {
  state: SettingsState
  messages: Messages
}

export function PreviewPanel({ state, messages }: PreviewPanelProps) {
  const localizedFontSize = new Intl.NumberFormat(state.language.value).format(state.fontSize.value)

  return (
    <section className="preview-panel" aria-labelledby="preview-title">
      <div className="preview-topline">
        <div>
          <p className="section-index">{messages.previewSection}</p>
          <h2 id="preview-title">{messages.previewTitle}</h2>
          <p className="preview-label">{messages.previewLabel}</p>
        </div>
        <span className="preview-live">
          <span className="live-dot" />
          {messages.live}
        </span>
      </div>

      <article className="preview-card">
        <div className="preview-card-top">
          <span className="preview-card-mark">
            <Check size={15} aria-hidden="true" />
          </span>
          <span>{messages.product}</span>
          <ArrowUpRight size={16} className="preview-arrow" aria-hidden="true" />
        </div>
        <h3>{messages.previewHeading}</h3>
        <p className="preview-copy">{messages.previewBody}</p>
        <div className="preview-divider" />
        <dl className="preview-facts">
          <div>
            <dt>{messages.previewTheme}</dt>
            <dd>{state.theme.value === "dark" ? messages.dark : messages.light}</dd>
          </div>
          <div>
            <dt>{messages.previewLanguage}</dt>
            <dd>{state.language.value.toUpperCase()}</dd>
          </div>
          <div>
            <dt>{messages.previewFontSize}</dt>
            <dd>{localizedFontSize}px</dd>
          </div>
        </dl>
      </article>
    </section>
  )
}
