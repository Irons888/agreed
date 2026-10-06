import {
  ArrowLeft, ArrowRight, AudioLines, BookOpen, CalendarDays, CalendarX2, Check, ChevronDown, ChevronRight,
  CircleCheck, CircleDashed, CircleQuestionMark, CircleX, Coins, Copy, Cpu, Download, ExternalLink, FileAudio,
  Gauge, History, Info, ListChecks, LoaderCircle, Pause, Pencil, Play, Quote, RotateCcw, RotateCw, ShieldCheck, Timer,
  Trash2, TriangleAlert, Upload, User, UserX, Waves, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/** The one map from meaning to icon. Components never import Lucide directly. */
export const ICONS = {
  agreed: CircleCheck,
  question: CircleQuestionMark,
  review: TriangleAlert,
  notAccepted: CircleDashed,
  cancelled: CircleX,
  changed: History,
  owner: User,
  noOwner: UserX,
  deadline: CalendarDays,
  noDate: CalendarX2,
  play: Play,
  pause: Pause,
  back: RotateCcw,
  forward: RotateCw,
  quote: Quote,
  verified: ShieldCheck,
  upload: Upload,
  file: FileAudio,
  sample: AudioLines,
  waveform: Waves,
  time: Timer,
  cost: Coins,
  model: Cpu,
  speed: Gauge,
  checks: ListChecks,
  docs: BookOpen,
  copy: Copy,
  download: Download,
  delete: Trash2,
  next: ArrowRight,
  previous: ArrowLeft,
  check: Check,
  close: X,
  info: Info,
  spinner: LoaderCircle,
  expand: ChevronDown,
  open: ChevronRight,
  external: ExternalLink,
  edit: Pencil,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16, label, className }: { name: IconName; size?: 14 | 16 | 20 | 24; label?: string; className?: string }) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={cn('shrink-0', name === 'spinner' && 'animate-spin', className)}
    />
  );
}
