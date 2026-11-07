import { AudioWaveform } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className="brand" to="/" aria-label="InsightFlow home"><span className="brand-mark"><AudioWaveform size={20} strokeWidth={2.2} /></span>{!compact && <span>Insight<span className="brand-light">Flow</span></span>}</Link>;
}
