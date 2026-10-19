import { Globe2, Moon, RotateCcw, Sun, Type } from "lucide-react"
import type { FieldName, FieldValueMap, Language, SettingsState } from "@/lib/tabsync/types"
import type { Messages } from "@/lib/i18n/dictionaries"

type SetField = <F extends FieldName>(field: F, value: FieldValueMap[F]) => void

interface SettingsControlsProps {
  state: SettingsState
  messages: Messages
  onChange: SetField
  onReset: () => void
  onCommit: () => void
}

const languageNames: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी · Hindi",
  ta: "தமிழ் · Tamil",
}

export function SettingsControls({
  state,
  messages,
  onChange,
  onReset,
  onCommit,
}: SettingsControlsProps) {
  const fontSizeLabel = new Intl.NumberFormat(state.language.value).format(state.fontSize.value)

  return (
    <section className="panel settings-panel" aria-labelledby="settings-title">
      <div className="panel-heading">
        <div>
          <p className="section-index">{messages.controlsSection}</p>
          <h2 id="settings-title">{messages.settingsTitle}</h2>
          <p className="panel-description">{messages.settingsDescription}</p>
        </div>
        <button className="text-button" type="button" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          {messages.reset}
        </button>
      </div>

      <div className="control-list">
        <fieldset className="control-row">
          <legend className="control-label">
            <span className="control-icon">
              <Sun size={17} aria-hidden="true" />
            </span>
            {messages.themeTitle}
          </legend>
          <p className="control-help">{messages.themeHelp}</p>
          <div className="segmented-control" role="group" aria-label={messages.themeTitle}>
            <button
              type="button"
              className="segment"
              aria-pressed={state.theme.value === "light"}
              onClick={() => onChange("theme", "light")}
            >
              <Sun size={16} aria-hidden="true" />
              {messages.light}
            </button>
            <button
              type="button"
              className="segment"
              aria-pressed={state.theme.value === "dark"}
              onClick={() => onChange("theme", "dark")}
            >
              <Moon size={16} aria-hidden="true" />
              {messages.dark}
            </button>
          </div>
        </fieldset>

        <div className="control-row">
          <label className="control-label" htmlFor="language-select">
            <span className="control-icon">
              <Globe2 size={17} aria-hidden="true" />
            </span>
            {messages.languageTitle}
          </label>
          <p className="control-help" id="language-help">
            {messages.languageHelp}
          </p>
          <select
            id="language-select"
            aria-describedby="language-help"
            value={state.language.value}
            onChange={(event) => onChange("language", event.target.value as Language)}
            className="select-control"
          >
            {(Object.keys(languageNames) as Language[]).map((language) => (
              <option key={language} value={language}>
                {languageNames[language]}
              </option>
            ))}
          </select>
        </div>

        <div className="control-row slider-row">
          <label className="control-label" htmlFor="font-size-slider">
            <span className="control-icon">
              <Type size={17} aria-hidden="true" />
            </span>
            {messages.fontTitle}
          </label>
          <p className="control-help" id="font-size-help">
            {messages.fontHelp}
          </p>
          <div className="slider-line">
            <input
              id="font-size-slider"
              aria-describedby="font-size-help"
              aria-valuetext={`${fontSizeLabel} ${messages.fontUnit}`}
              type="range"
              min={14}
              max={24}
              step={1}
              value={state.fontSize.value}
              onChange={(event) => onChange("fontSize", Number(event.target.value))}
              onPointerUp={onCommit}
              onKeyUp={onCommit}
              onBlur={onCommit}
            />
            <output className="size-readout" htmlFor="font-size-slider">
              {fontSizeLabel}
              <span>px</span>
            </output>
          </div>
        </div>
      </div>
    </section>
  )
}
