export interface RotatingTextConfig {
  texts: string[];
  transition?: {
    type?: string;
    damping?: number;
    stiffness?: number;
  };
  initial?: { y: string; opacity: number };
  animate?: { y: string; opacity: number };
  exit?: { y: string; opacity: number };
  animatePresenceMode?: 'wait' | 'sync';
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: 'first' | 'last' | 'center' | 'random' | number;
  loop?: boolean;
  auto?: boolean;
  splitBy?: 'characters' | 'words' | 'lines' | string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
}

