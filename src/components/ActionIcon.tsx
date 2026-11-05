import type { ReactNode } from 'react';
import { actionIconUrl, actionKeyFromText, statusIconUrl } from '../data/xivapi';

export function ActionIcon({ id, size = 28, className = '' }: { id: string; size?: number; className?: string }) {
  const url = actionIconUrl(id);
  if (!url) return null;
  return <img className={`action-icon ${className}`} src={url} width={size} height={size} alt="" loading="lazy" draggable={false} />;
}

export function StatusIcon({ name, size = 18 }: { name: string; size?: number }) {
  const url = statusIconUrl(name);
  if (!url) return null;
  // ícones de status do jogo são retangulares (24×32)
  return <img className="status-icon" src={url} height={size} alt="" loading="lazy" draggable={false} />;
}

/** Chip de texto que ganha o ícone da ação quando o texto começa com o nome dela. */
export function SpellChip({ text, className = '', children }: { text: string; className?: string; children?: ReactNode }) {
  const key = actionKeyFromText(text);
  return (
    <span className={`chip ${className} ${key ? 'with-icon' : ''}`}>
      {key && <ActionIcon id={key} size={22} />}
      {text}
      {children}
    </span>
  );
}
