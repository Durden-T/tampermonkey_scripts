import { getTexts } from '../i18n';

interface HelpTooltipProps {
  show: boolean;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export function HelpTooltip({ show, onClose }: HelpTooltipProps) {
  if (!show) return null;

  const t = getTexts();

  return (
    <div className="help-tooltip-overlay" onClick={onClose}>
      <div className="help-tooltip" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h3>{t.help.title}</h3>
          <button onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="help-content tm-scrollbar">
          {t.help.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
