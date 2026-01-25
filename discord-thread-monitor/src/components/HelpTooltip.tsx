import { getTexts } from '../i18n';
import { CloseIcon } from './Icons';

interface HelpTooltipProps {
  show: boolean;
  onClose: () => void;
}

export function HelpTooltip({ show, onClose }: HelpTooltipProps) {
  if (!show) {
    return null;
  }

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
