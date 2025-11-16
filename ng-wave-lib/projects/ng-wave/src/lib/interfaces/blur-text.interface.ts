export interface BlurTextAnimationFrom {
    filter?: string;
    opacity?: number;
    y?: number;
    [key: string]: string | number | undefined;
}

export interface BlurTextAnimationTo extends Array<BlurTextAnimationFrom> { }

export type BlurTextAnimateBy = 'words' | 'letters';
export type BlurTextDirection = 'top' | 'bottom';

export interface BlurTextConfig {
    text?: string;
    delay?: number;
    className?: string;
    animateBy?: BlurTextAnimateBy;
    direction?: BlurTextDirection;
    threshold?: number;
    rootMargin?: string;
    animationFrom?: BlurTextAnimationFrom;
    animationTo?: BlurTextAnimationTo;
    easing?: (t: number) => number;
    onAnimationComplete?: () => void;
    stepDuration?: number;
}

