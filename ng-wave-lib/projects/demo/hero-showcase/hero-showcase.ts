import { Component, signal, computed, effect, inject, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { BlurTextComponent } from '../../ng-wave/src/lib/text-animations/blur-text/blur-text.component';
import { GradientTextComponent } from '../../ng-wave/src/lib/text-animations/gradient-text/gradient-text.component';
import { FloatingLinesComponent } from '../../ng-wave/src/lib/backgrounds/floating-lines/floating-lines.component';
import { FadeContentComponent } from '../../ng-wave/src/lib/animations/fade-content/fade-content.component';
import { TextTypeComponent } from '../../ng-wave/src/lib/text-animations/text-type/text-type.component';
import { CountUpComponent } from '../../ng-wave/src/lib/text-animations/count-up/count-up.component';
import { AnimatedContentComponent } from '../../ng-wave/src/lib/animations/animated-content/animated-content.component';
import { ShinyTextComponent } from '../../ng-wave/src/lib/text-animations/shiny-text/shiny-text.component';
import { ScrollRevealComponent } from '../../ng-wave/src/lib/text-animations/scroll-reveal/scroll-reveal.component';
import { ElectricBorderComponent } from '../../ng-wave/src/lib/animations/electric-border/electric-border.component';
import { GlareHoverComponent } from '../../ng-wave/src/lib/animations/glare-hover/glare-hover.component';
import { MagnetComponent } from '../../ng-wave/src/lib/animations/magnet/magnet.component';
import { RotatingTextComponent } from '../../ng-wave/src/lib/text-animations/rotating-text/rotating-text.component';
import { GlitchTextComponent } from '../../ng-wave/src/lib/text-animations/glitch-text/glitch-text.component';
import { ClickSparkComponent } from '../../ng-wave/src/lib/animations/click-spark/click-spark.component';
import { CrosshairComponent } from '../../ng-wave/src/lib/animations/crosshair/crosshair.component';
import { BlobCursorComponent } from '../../ng-wave/src/lib/animations/blob-cursor/blob-cursor.component';
import { CircularTextComponent } from '../../ng-wave/src/lib/text-animations/circular-text/circular-text.component';
import { AnimatedListComponent } from '../../ng-wave/src/lib/components/animated-list/animated-list.component';
import { CounterComponent } from '../../ng-wave/src/lib/components/counter/counter.component';
import { BounceCardsComponent } from '../../ng-wave/src/lib/components/bounce-cards/bounce-cards.component';
import { SpotlightCardComponent } from '../../ng-wave/src/lib/components/spotlight-card/spotlight-card.component';
import { TextCursorComponent } from '../../ng-wave/src/lib/text-animations/text-cursor/text-cursor.component';
import { NoiseComponent } from '../../ng-wave/src/lib/animations/noise/noise.component';
import { CurvedLoopComponent } from '../../ng-wave/src/lib/text-animations/curved-loop/curved-loop.component';
import { StarBorderComponent } from '../../ng-wave/src/lib/animations/star-border/star-border.component';
import { TargetCursorComponent } from '../../ng-wave/src/lib/animations/target-cursor/target-cursor.component';
import { FuzzyTextComponent } from '../../ng-wave/src/lib/text-animations/fuzzy-text/fuzzy-text.component';
import { ScrambledTextComponent } from '../../ng-wave/src/lib/text-animations/scrambled-text/scrambled-text.component';
import { FallingTextComponent } from '../../ng-wave/src/lib/text-animations/falling-text/falling-text.component';
import { ShuffleComponent } from '../../ng-wave/src/lib/text-animations/shuffle/shuffle.component';
import { GhostCursorComponent } from '../../ng-wave/src/lib/animations/ghost-cursor/ghost-cursor.component';
import { DecryptedTextComponent } from '../../ng-wave/src/lib/text-animations/decrypted-text/decrypted-text.component';
import { ScrollFloatComponent } from '../../ng-wave/src/lib/text-animations/scroll-float/scroll-float.component';
import { CubesComponent } from '../../ng-wave/src/lib/animations/cubes/cubes.component';
import { ScrollVelocityComponent } from '../../ng-wave/src/lib/text-animations/scroll-velocity/scroll-velocity.component';
import { GradualBlurComponent } from '../../ng-wave/src/lib/animations/gradual-blur/gradual-blur.component';
import { MagnetLinesComponent } from '../../ng-wave/src/lib/animations/magnet-lines/magnet-lines.component';
import { ImageTrailComponent } from '../../ng-wave/src/lib/animations/image-trail/image-trail.component';
import { LaserFlowComponent } from '../../ng-wave/src/lib/animations/laser-flow/laser-flow.component';
import { LogoLoopComponent } from '../../ng-wave/src/lib/animations/logo-loop/logo-loop.component';
import { MetaBallsComponent } from '../../ng-wave/src/lib/animations/meta-balls/meta-balls.component';
import { MetallicPaintComponent } from '../../ng-wave/src/lib/animations/metallic-paint/metallic-paint.component';
import { PixelTrailComponent } from '../../ng-wave/src/lib/animations/pixel-trail/pixel-trail.component';
import { PixelTransitionComponent } from '../../ng-wave/src/lib/animations/pixel-transition/pixel-transition.component';
import { RibbonsComponent } from '../../ng-wave/src/lib/animations/ribbons/ribbons.component';
import { ShapeBlurComponent } from '../../ng-wave/src/lib/animations/shape-blur/shape-blur.component';
import { SplashCursorComponent } from '../../ng-wave/src/lib/animations/splash-cursor/splash-cursor.component';
import { StickerPeelComponent } from '../../ng-wave/src/lib/animations/sticker-peel/sticker-peel.component';
import { TrueFocusComponent } from '../../ng-wave/src/lib/text-animations/true-focus/true-focus.component';
import { VariableProximityComponent } from '../../ng-wave/src/lib/text-animations/variable-proximity/variable-proximity.component';
import { SplitTextComponent } from '../../ng-wave/src/lib/text-animations/split-text/split-text.component';
import { TextPressureComponent } from '../../ng-wave/src/lib/text-animations/text-pressure/text-pressure.component';
import { ASCIITextComponent } from '../../ng-wave/src/lib/text-animations/ascii-text/ascii-text.component';
import { SquaresComponent } from '../../ng-wave/src/lib/backgrounds/squares/squares.component';
import { WavesComponent } from '../../ng-wave/src/lib/backgrounds/waves/waves.component';
import { DotGridComponent } from '../../ng-wave/src/lib/backgrounds/dot-grid/dot-grid.component';
import { AuroraComponent } from '../../ng-wave/src/lib/backgrounds/aurora/aurora.component';
import { BeamsComponent } from '../../ng-wave/src/lib/backgrounds/beams/beams.component';
import { PlasmaComponent } from '../../ng-wave/src/lib/backgrounds/plasma/plasma.component';
import { OrbComponent } from '../../ng-wave/src/lib/backgrounds/orb/orb.component';
import { ParticlesComponent } from '../../ng-wave/src/lib/backgrounds/particles/particles.component';
import { RippleGridComponent } from '../../ng-wave/src/lib/backgrounds/ripple-grid/ripple-grid.component';
import { DitherComponent } from '../../ng-wave/src/lib/backgrounds/dither/dither.component';
import { GalaxyComponent } from '../../ng-wave/src/lib/backgrounds/galaxy/galaxy.component';
import { LightningComponent } from '../../ng-wave/src/lib/backgrounds/lightning/lightning.component';
import { BalatroComponent } from '../../ng-wave/src/lib/backgrounds/balatro/balatro.component';
import { ColorBendsComponent } from '../../ng-wave/src/lib/backgrounds/color-bends/color-bends.component';
import { LightRaysComponent } from '../../ng-wave/src/lib/backgrounds/light-rays/light-rays.component';
import { GridMotionComponent } from '../../ng-wave/src/lib/backgrounds/grid-motion/grid-motion.component';
import { BallpitComponent } from '../../ng-wave/src/lib/backgrounds/ballpit/ballpit.component';
import { DarkVeilComponent } from '../../ng-wave/src/lib/backgrounds/dark-veil/dark-veil.component';
import { FaultyTerminalComponent } from '../../ng-wave/src/lib/backgrounds/faulty-terminal/faulty-terminal.component';
import { TiltedCardComponent } from '../../ng-wave/src/lib/components/tilted-card/tilted-card.component';
import { DecayCardComponent } from '../../ng-wave/src/lib/components/decay-card/decay-card.component';
import { StepperComponent, StepComponent } from '../../ng-wave/src/lib/components/stepper/stepper.component';
import { PixelCardComponent } from '../../ng-wave/src/lib/components/pixel-card/pixel-card.component';
import { StackComponent } from '../../ng-wave/src/lib/components/stack/stack.component';
import { CardSwapComponent, CardComponent } from '../../ng-wave/src/lib/components/card-swap/card-swap.component';
import { CarouselComponent } from '../../ng-wave/src/lib/components/carousel/carousel.component';
import { BubbleMenuComponent } from '../../ng-wave/src/lib/components/bubble-menu/bubble-menu.component';
import { CardNavComponent } from '../../ng-wave/src/lib/components/card-nav/card-nav.component';
import { GooeyNavComponent } from '../../ng-wave/src/lib/components/gooey-nav/gooey-nav.component';
import { StaggeredMenuComponent } from '../../ng-wave/src/lib/components/staggered-menu/staggered-menu.component';
import { FlowingMenuComponent } from '../../ng-wave/src/lib/components/flowing-menu/flowing-menu.component';
import { FolderComponent } from '../../ng-wave/src/lib/components/folder/folder.component';
import { GlassSurfaceComponent } from '../../ng-wave/src/lib/components/glass-surface/glass-surface.component';
import { GlassIconsComponent } from '../../ng-wave/src/lib/components/glass-icons/glass-icons.component';
import { ChromaGridComponent } from '../../ng-wave/src/lib/components/chroma-grid/chroma-grid.component';
import { DockComponent } from '../../ng-wave/src/lib/components/dock/dock.component';
import { ElasticSliderComponent } from '../../ng-wave/src/lib/components/elastic-slider/elastic-slider.component';
import { CircularGalleryComponent } from '../../ng-wave/src/lib/components/circular-gallery/circular-gallery.component';
import { DomeGalleryComponent } from '../../ng-wave/src/lib/components/dome-gallery/dome-gallery.component';
import { FlyingPostersComponent } from '../../ng-wave/src/lib/components/flying-posters/flying-posters.component';
import { InfiniteMenuComponent } from '../../ng-wave/src/lib/components/infinite-menu/infinite-menu.component';
import { PillNavComponent } from '../../ng-wave/src/lib/components/pill-nav/pill-nav.component';
import { MagicBentoComponent } from '../../ng-wave/src/lib/components/magic-bento/magic-bento.component';
import { MasonryComponent } from '../../ng-wave/src/lib/components/masonry/masonry.component';
import { ProfileCardComponent } from '../../ng-wave/src/lib/components/profile-card/profile-card.component';
import { ScrollStackComponent, ScrollStackItemComponent } from '../../ng-wave/src/lib/components/scroll-stack/scroll-stack.component';
import { LanyardComponent } from '../../ng-wave/src/lib/components/lanyard/lanyard.component';
import { ModelViewerComponent } from '../../ng-wave/src/lib/components/model-viewer/model-viewer.component';
import { GradientBlindsComponent } from '../../ng-wave/src/lib/backgrounds/gradient-blinds/gradient-blinds.component';
import { GridDistortionComponent } from '../../ng-wave/src/lib/backgrounds/grid-distortion/grid-distortion.component';
import { GridScanComponent } from '../../ng-wave/src/lib/backgrounds/grid-scan/grid-scan.component';
import { IridescenceComponent } from '../../ng-wave/src/lib/backgrounds/iridescence/iridescence.component';
import { LetterGlitchComponent } from '../../ng-wave/src/lib/backgrounds/letter-glitch/letter-glitch.component';
import { LiquidChromeComponent } from '../../ng-wave/src/lib/backgrounds/liquid-chrome/liquid-chrome.component';
import { ThreadsComponent } from '../../ng-wave/src/lib/backgrounds/threads/threads.component';
import { SilkComponent } from '../../ng-wave/src/lib/backgrounds/silk/silk.component';
import { PrismComponent } from '../../ng-wave/src/lib/backgrounds/prism/prism.component';
import { PrismaticBurstComponent } from '../../ng-wave/src/lib/backgrounds/prismatic-burst/prismatic-burst.component';
import { PixelBlastComponent } from '../../ng-wave/src/lib/backgrounds/pixel-blast/pixel-blast.component';
import { NeuralWebComponent } from '../../ng-wave/src/lib/backgrounds/neural-web/neural-web.component';
import { LiquidEtherComponent } from '../../ng-wave/src/lib/backgrounds/liquid-ether/liquid-ether.component';

export type EffectType = 'none' | 'blur-text' | 'gradient-text' | 'fade-content' | 'floating-lines' | 'text-type' | 'count-up' | 'animated-content' | 'shiny-text' | 'scroll-reveal' | 'electric-border' | 'glare-hover' | 'magnet' | 'rotating-text' | 'glitch-text' | 'click-spark' | 'crosshair' | 'blob-cursor' | 'circular-text' | 'bounce-cards' | 'spotlight-card' | 'text-cursor' | 'noise' | 'curved-loop' | 'star-border' | 'target-cursor' | 'fuzzy-text' | 'scrambled-text' | 'falling-text' | 'shuffle' | 'ghost-cursor' | 'decrypted-text' | 'scroll-float' | 'cubes' | 'scroll-velocity' | 'gradual-blur' | 'magnet-lines' | 'true-focus' | 'variable-proximity' | 'split-text' | 'text-pressure' | 'ascii-text' | 'squares' | 'waves' | 'dot-grid' | 'grid-motion' | 'aurora' | 'beams' | 'plasma' | 'orb' | 'particles' | 'ripple-grid' | 'dither' | 'galaxy' | 'lightning' | 'balatro' | 'color-bends' | 'light-rays' | 'ballpit' | 'dark-veil' | 'faulty-terminal' | 'animated-list' | 'counter' | 'tilted-card' | 'decay-card' | 'stepper' | 'pixel-card' | 'stack' | 'card-swap' | 'carousel' | 'bubble-menu' | 'card-nav' | 'gooey-nav' | 'staggered-menu' | 'flowing-menu' | 'folder' | 'glass-surface' | 'glass-icons' | 'chroma-grid' | 'dock' | 'elastic-slider' | 'circular-gallery' | 'dome-gallery' | 'flying-posters' | 'infinite-menu' | 'pill-nav' | 'magic-bento' | 'masonry' | 'profile-card' | 'scroll-stack' | 'lanyard' | 'model-viewer' | 'image-trail' | 'pixel-transition' | 'logo-loop' | 'sticker-peel' | 'shape-blur' | 'pixel-trail' | 'laser-flow' | 'ribbons' | 'meta-balls' | 'metallic-paint' | 'splash-cursor' | 'gradient-blinds' | 'grid-distortion' | 'grid-scan' | 'iridescence' | 'letter-glitch' | 'liquid-chrome' | 'threads' | 'silk' | 'prism' | 'prismatic-burst' | 'pixel-blast' | 'neural-web' | 'liquid-ether';

interface FormControlConfig {
  key: string;
  label: string;
  type: 'number' | 'text' | 'boolean' | 'select' | 'color';
  defaultValue: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

@Component({
  selector: 'app-hero-showcase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BlurTextComponent, GradientTextComponent, FloatingLinesComponent, FadeContentComponent, TextTypeComponent, CountUpComponent, AnimatedContentComponent, ShinyTextComponent, ScrollRevealComponent, ElectricBorderComponent, GlareHoverComponent, MagnetComponent, RotatingTextComponent, GlitchTextComponent, ClickSparkComponent, CrosshairComponent, BlobCursorComponent, CircularTextComponent, AnimatedListComponent, CounterComponent, BounceCardsComponent, SpotlightCardComponent, TextCursorComponent, NoiseComponent, CurvedLoopComponent, StarBorderComponent, TargetCursorComponent, FuzzyTextComponent, ScrambledTextComponent, FallingTextComponent, ShuffleComponent, GhostCursorComponent, DecryptedTextComponent, ScrollFloatComponent, CubesComponent, ScrollVelocityComponent, GradualBlurComponent, MagnetLinesComponent, ImageTrailComponent, LaserFlowComponent, LogoLoopComponent, MetaBallsComponent, MetallicPaintComponent, PixelTrailComponent, PixelTransitionComponent, RibbonsComponent, ShapeBlurComponent, SplashCursorComponent, StickerPeelComponent, TrueFocusComponent, VariableProximityComponent, SplitTextComponent, TextPressureComponent, ASCIITextComponent, SquaresComponent, WavesComponent, DotGridComponent, GridMotionComponent, AuroraComponent, BeamsComponent, PlasmaComponent, OrbComponent, ParticlesComponent, RippleGridComponent, DitherComponent, GalaxyComponent, LightningComponent, BalatroComponent, ColorBendsComponent, LightRaysComponent, BallpitComponent, DarkVeilComponent, FaultyTerminalComponent, TiltedCardComponent, DecayCardComponent, StepperComponent, StepComponent, PixelCardComponent, StackComponent, CardSwapComponent, CardComponent, CarouselComponent, BubbleMenuComponent, CardNavComponent, GooeyNavComponent, StaggeredMenuComponent, FlowingMenuComponent, FolderComponent, GlassSurfaceComponent, GlassIconsComponent, ChromaGridComponent, DockComponent, ElasticSliderComponent, CircularGalleryComponent, DomeGalleryComponent, FlyingPostersComponent, InfiniteMenuComponent, PillNavComponent, MagicBentoComponent, MasonryComponent, ProfileCardComponent, ScrollStackComponent, ScrollStackItemComponent, LanyardComponent, ModelViewerComponent, GradientBlindsComponent, GridDistortionComponent, GridScanComponent, IridescenceComponent, LetterGlitchComponent, LiquidChromeComponent, ThreadsComponent, SilkComponent, PrismComponent, PrismaticBurstComponent, PixelBlastComponent, NeuralWebComponent, LiquidEtherComponent],
  templateUrl: './hero-showcase.html',
  styleUrl: './hero-showcase.css'
})

export class HeroShowcaseComponent {
  private readonly injector = inject(Injector);
  readonly selectedEffect = signal<EffectType>('floating-lines');
  readonly expandedCategories = signal<Set<string>>(new Set(['Backgrounds']));
  controlsForm = new FormGroup({});
  readonly showControls = computed(() => this.selectedEffect() !== 'none');

  // Signal-based form values for ASCII text component
  readonly asciiTextFontSize = signal(200);
  readonly asciiFontSize = signal(2);
  readonly asciiGradient = signal<string | { type: 'linear' | 'radial'; colors: string[]; stops?: number[] } | undefined>(undefined);
  readonly asciiTextColor = signal('#fdf9f3');
  readonly asciiEnableWaves = signal(true);
  readonly asciiContainerHeight = signal(400);

  readonly effects: Array<{ id: EffectType; name: string; category: string }> = [
    { id: 'none', name: 'None', category: 'Default' },
    { id: 'blur-text', name: 'Blur Text', category: 'Text Animations' },
    { id: 'gradient-text', name: 'Gradient Text', category: 'Text Animations' },
    { id: 'text-type', name: 'Text Type', category: 'Text Animations' },
    { id: 'count-up', name: 'Count Up', category: 'Text Animations' },
    { id: 'shiny-text', name: 'Shiny Text', category: 'Text Animations' },
    { id: 'scroll-reveal', name: 'Scroll Reveal', category: 'Text Animations' },
    { id: 'rotating-text', name: 'Rotating Text', category: 'Text Animations' },
    { id: 'glitch-text', name: 'Glitch Text', category: 'Text Animations' },
    { id: 'fade-content', name: 'Fade Content', category: 'Animations' },
    { id: 'animated-content', name: 'Animated Content', category: 'Animations' },
    { id: 'electric-border', name: 'Electric Border', category: 'Animations' },
    { id: 'glare-hover', name: 'Glare Hover', category: 'Animations' },
    { id: 'magnet', name: 'Magnet', category: 'Animations' },
    { id: 'click-spark', name: 'Click Spark', category: 'Animations' },
    { id: 'crosshair', name: 'Crosshair', category: 'Animations' },
    { id: 'blob-cursor', name: 'Blob Cursor', category: 'Animations' },
    { id: 'circular-text', name: 'Circular Text', category: 'Text Animations' },
    { id: 'text-cursor', name: 'Text Cursor', category: 'Text Animations' },
    { id: 'curved-loop', name: 'Curved Loop', category: 'Text Animations' },
    { id: 'fuzzy-text', name: 'Fuzzy Text', category: 'Text Animations' },
    { id: 'scrambled-text', name: 'Scrambled Text', category: 'Text Animations' },
    { id: 'falling-text', name: 'Falling Text', category: 'Text Animations' },
    { id: 'shuffle', name: 'Shuffle', category: 'Text Animations' },
    { id: 'decrypted-text', name: 'Decrypted Text', category: 'Text Animations' },
    { id: 'scroll-float', name: 'Scroll Float', category: 'Text Animations' },
    { id: 'scroll-velocity', name: 'Scroll Velocity', category: 'Text Animations' },
    { id: 'true-focus', name: 'True Focus', category: 'Text Animations' },
    { id: 'variable-proximity', name: 'Variable Proximity', category: 'Text Animations' },
    { id: 'split-text', name: 'Split Text', category: 'Text Animations' },
    { id: 'text-pressure', name: 'Text Pressure', category: 'Text Animations' },
    { id: 'ascii-text', name: 'ASCII Text', category: 'Text Animations' },
    { id: 'bounce-cards', name: 'Bounce Cards', category: 'Components' },
    { id: 'spotlight-card', name: 'Spotlight Card', category: 'Components' },
    { id: 'tilted-card', name: 'Tilted Card', category: 'Components' },
    { id: 'decay-card', name: 'Decay Card', category: 'Components' },
    { id: 'stepper', name: 'Stepper', category: 'Components' },
    { id: 'pixel-card', name: 'Pixel Card', category: 'Components' },
    { id: 'stack', name: 'Stack', category: 'Components' },
    { id: 'card-swap', name: 'Card Swap', category: 'Components' },
    { id: 'carousel', name: 'Carousel', category: 'Components' },
    { id: 'bubble-menu', name: 'Bubble Menu', category: 'Components' },
    { id: 'card-nav', name: 'Card Nav', category: 'Components' },
    { id: 'gooey-nav', name: 'Gooey Nav', category: 'Components' },
    { id: 'staggered-menu', name: 'Staggered Menu', category: 'Components' },
    { id: 'flowing-menu', name: 'Flowing Menu', category: 'Components' },
    { id: 'folder', name: 'Folder', category: 'Components' },
    { id: 'glass-surface', name: 'Glass Surface', category: 'Components' },
    { id: 'glass-icons', name: 'Glass Icons', category: 'Components' },
    { id: 'chroma-grid', name: 'Chroma Grid', category: 'Components' },
    { id: 'dock', name: 'Dock', category: 'Components' },
    { id: 'elastic-slider', name: 'Elastic Slider', category: 'Components' },
    { id: 'circular-gallery', name: 'Circular Gallery', category: 'Components' },
    { id: 'dome-gallery', name: 'Dome Gallery', category: 'Components' },
    { id: 'flying-posters', name: 'Flying Posters', category: 'Components' },
    { id: 'infinite-menu', name: 'Infinite Menu', category: 'Components' },
    { id: 'pill-nav', name: 'Pill Nav', category: 'Components' },
    { id: 'magic-bento', name: 'Magic Bento', category: 'Components' },
    { id: 'masonry', name: 'Masonry', category: 'Components' },
    { id: 'profile-card', name: 'Profile Card', category: 'Components' },
    { id: 'scroll-stack', name: 'Scroll Stack', category: 'Components' },
    { id: 'lanyard', name: 'Lanyard', category: 'Components' },
    { id: 'model-viewer', name: 'Model Viewer', category: 'Components' },
    { id: 'animated-list', name: 'Animated List', category: 'Components' },
    { id: 'counter', name: 'Counter', category: 'Components' },
    { id: 'noise', name: 'Noise', category: 'Animations' },
    { id: 'star-border', name: 'Star Border', category: 'Animations' },
    { id: 'target-cursor', name: 'Target Cursor', category: 'Animations' },
    { id: 'ghost-cursor', name: 'Ghost Cursor', category: 'Animations' },
    { id: 'cubes', name: 'Cubes', category: 'Animations' },
    { id: 'gradual-blur', name: 'Gradual Blur', category: 'Animations' },
    { id: 'magnet-lines', name: 'Magnet Lines', category: 'Animations' },
    { id: 'image-trail', name: 'Image Trail', category: 'Animations' },
    { id: 'laser-flow', name: 'Laser Flow', category: 'Animations' },
    { id: 'logo-loop', name: 'Logo Loop', category: 'Animations' },
    { id: 'meta-balls', name: 'Meta Balls', category: 'Animations' },
    { id: 'metallic-paint', name: 'Metallic Paint', category: 'Animations' },
    { id: 'pixel-trail', name: 'Pixel Trail', category: 'Animations' },
    { id: 'pixel-transition', name: 'Pixel Transition', category: 'Animations' },
    { id: 'ribbons', name: 'Ribbons', category: 'Animations' },
    { id: 'shape-blur', name: 'Shape Blur', category: 'Animations' },
    { id: 'splash-cursor', name: 'Splash Cursor', category: 'Animations' },
    { id: 'sticker-peel', name: 'Sticker Peel', category: 'Animations' },
    { id: 'floating-lines', name: 'Floating Lines', category: 'Backgrounds' },
    { id: 'squares', name: 'Squares', category: 'Backgrounds' },
    { id: 'waves', name: 'Waves', category: 'Backgrounds' },
    { id: 'dot-grid', name: 'Dot Grid', category: 'Backgrounds' },
    { id: 'grid-motion', name: 'Grid Motion', category: 'Backgrounds' },
    { id: 'aurora', name: 'Aurora', category: 'Backgrounds' },
    { id: 'beams', name: 'Beams', category: 'Backgrounds' },
    { id: 'plasma', name: 'Plasma', category: 'Backgrounds' },
    { id: 'orb', name: 'Orb', category: 'Backgrounds' },
    { id: 'particles', name: 'Particles', category: 'Backgrounds' },
    { id: 'ripple-grid', name: 'Ripple Grid', category: 'Backgrounds' },
    { id: 'dither', name: 'Dither', category: 'Backgrounds' },
    { id: 'galaxy', name: 'Galaxy', category: 'Backgrounds' },
    { id: 'lightning', name: 'Lightning', category: 'Backgrounds' },
    { id: 'balatro', name: 'Balatro', category: 'Backgrounds' },
    { id: 'color-bends', name: 'Color Bends', category: 'Backgrounds' },
    { id: 'light-rays', name: 'Light Rays', category: 'Backgrounds' },
    { id: 'ballpit', name: 'Ballpit', category: 'Backgrounds' },
    { id: 'dark-veil', name: 'Dark Veil', category: 'Backgrounds' },
    { id: 'faulty-terminal', name: 'Faulty Terminal', category: 'Backgrounds' },
    { id: 'gradient-blinds', name: 'Gradient Blinds', category: 'Backgrounds' },
    { id: 'grid-distortion', name: 'Grid Distortion', category: 'Backgrounds' },
    { id: 'grid-scan', name: 'Grid Scan', category: 'Backgrounds' },
    { id: 'iridescence', name: 'Iridescence', category: 'Backgrounds' },
    { id: 'letter-glitch', name: 'Letter Glitch', category: 'Backgrounds' },
    { id: 'liquid-chrome', name: 'Liquid Chrome', category: 'Backgrounds' },
    { id: 'threads', name: 'Threads', category: 'Backgrounds' },
    { id: 'silk', name: 'Silk', category: 'Backgrounds' },
    { id: 'prism', name: 'Prism', category: 'Backgrounds' },
    { id: 'prismatic-burst', name: 'Prismatic Burst', category: 'Backgrounds' },
    { id: 'pixel-blast', name: 'Pixel Blast', category: 'Backgrounds' },
    { id: 'neural-web', name: 'Neural Web', category: 'Backgrounds' },
    { id: 'liquid-ether', name: 'Liquid Ether', category: 'Backgrounds' }
  ];

  readonly heroText = 'NG Wave';
  readonly heroSubtext = 'Angular Component Library';
  readonly heroDescription = 'A comprehensive collection of 130+ animated, interactive, and customizable Angular components. Converted from React Bits with full feature parity, built with Angular Signals, GSAP animations, and Three.js for stunning visual effects.';
  readonly heroFeatures = [
    '130+ Components',
    'Fully Typed',
    'SSR Compatible',
    'Standalone Architecture'
  ];

  readonly componentConfigs: Partial<Record<EffectType, FormControlConfig[]>> = {
    'none': [],
    'blur-text': [
      { key: 'delay', label: 'Delay (ms)', type: 'number', defaultValue: 150, min: 0, max: 2000, step: 10 },
      { key: 'animateBy', label: 'Animate By', type: 'select', defaultValue: 'words', options: ['words', 'letters'] },
      { key: 'direction', label: 'Direction', type: 'select', defaultValue: 'top', options: ['top', 'bottom'] },
      { key: 'threshold', label: 'Threshold', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.1 },
      { key: 'stepDuration', label: 'Step Duration', type: 'number', defaultValue: 0.35, min: 0.1, max: 2, step: 0.05 }
    ],
    'gradient-text': [
      { key: 'animationSpeed', label: 'Animation Speed', type: 'number', defaultValue: 8, min: 1, max: 20, step: 1 },
      { key: 'showBorder', label: 'Show Border', type: 'boolean', defaultValue: false },
      { key: 'color1', label: 'Color 1', type: 'color', defaultValue: '#40ffaa' },
      { key: 'color2', label: 'Color 2', type: 'color', defaultValue: '#4079ff' }
    ],
    'text-type': [
      { key: 'typingSpeed', label: 'Typing Speed (ms)', type: 'number', defaultValue: 80, min: 10, max: 500, step: 10 },
      { key: 'pauseDuration', label: 'Pause Duration (ms)', type: 'number', defaultValue: 2000, min: 0, max: 5000, step: 100 },
      { key: 'loop', label: 'Loop', type: 'boolean', defaultValue: true },
      { key: 'showCursor', label: 'Show Cursor', type: 'boolean', defaultValue: true }
    ],
    'count-up': [
      { key: 'from', label: 'From', type: 'number', defaultValue: 0, min: 0, max: 10000, step: 1 },
      { key: 'to', label: 'To', type: 'number', defaultValue: 2024, min: 0, max: 10000, step: 1 },
      { key: 'duration', label: 'Duration (s)', type: 'number', defaultValue: 2, min: 0.5, max: 10, step: 0.1 },
      { key: 'delay', label: 'Delay (s)', type: 'number', defaultValue: 0.5, min: 0, max: 5, step: 0.1 }
    ],
    'shiny-text': [
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 5, min: 1, max: 20, step: 1 }
    ],
    'scroll-reveal': [
      { key: 'enableBlur', label: 'Enable Blur', type: 'boolean', defaultValue: true }
    ],
    'fade-content': [
      { key: 'blur', label: 'Blur', type: 'boolean', defaultValue: true },
      { key: 'duration', label: 'Duration (ms)', type: 'number', defaultValue: 1000, min: 100, max: 5000, step: 100 },
      { key: 'delay', label: 'Delay (ms)', type: 'number', defaultValue: 200, min: 0, max: 2000, step: 50 },
      { key: 'threshold', label: 'Threshold', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.1 }
    ],
    'animated-content': [
      { key: 'distance', label: 'Distance', type: 'number', defaultValue: 100, min: 0, max: 500, step: 10 },
      { key: 'direction', label: 'Direction', type: 'select', defaultValue: 'vertical', options: ['vertical', 'horizontal'] },
      { key: 'duration', label: 'Duration (s)', type: 'number', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
      { key: 'threshold', label: 'Threshold', type: 'number', defaultValue: 0.2, min: 0, max: 1, step: 0.1 }
    ],
    'electric-border': [
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#5227FF' },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
      { key: 'chaos', label: 'Chaos', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 },
      { key: 'thickness', label: 'Thickness', type: 'number', defaultValue: 2, min: 1, max: 10, step: 1 }
    ],
    'glare-hover': [
      { key: 'width', label: 'Width', type: 'text', defaultValue: '500px' },
      { key: 'height', label: 'Height', type: 'text', defaultValue: '500px' },
      { key: 'background', label: 'Background', type: 'color', defaultValue: '#000000' },
      { key: 'borderRadius', label: 'Border Radius', type: 'text', defaultValue: '10px' },
      { key: 'borderColor', label: 'Border Color', type: 'color', defaultValue: '#333333' },
      { key: 'glareColor', label: 'Glare Color', type: 'color', defaultValue: '#ffffff' },
      { key: 'glareOpacity', label: 'Glare Opacity', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
      { key: 'glareAngle', label: 'Glare Angle', type: 'number', defaultValue: -45, min: -180, max: 180, step: 5 },
      { key: 'glareSize', label: 'Glare Size', type: 'number', defaultValue: 250, min: 50, max: 500, step: 10 },
      { key: 'transitionDuration', label: 'Transition Duration (ms)', type: 'number', defaultValue: 650, min: 100, max: 2000, step: 50 },
      { key: 'playOnce', label: 'Play Once', type: 'boolean', defaultValue: false }
    ],
    'magnet': [
      { key: 'magnetStrength', label: 'Magnet Strength', type: 'number', defaultValue: 3, min: 0, max: 10, step: 0.5 },
      { key: 'padding', label: 'Padding', type: 'number', defaultValue: 150, min: 0, max: 500, step: 10 }
    ],
    'rotating-text': [
      { key: 'rotationInterval', label: 'Rotation Interval (ms)', type: 'number', defaultValue: 3000, min: 500, max: 10000, step: 100 },
      { key: 'auto', label: 'Auto', type: 'boolean', defaultValue: true },
      { key: 'loop', label: 'Loop', type: 'boolean', defaultValue: true },
      { key: 'staggerDuration', label: 'Stagger Duration', type: 'number', defaultValue: 0.02, min: 0, max: 0.5, step: 0.01 }
    ],
    'glitch-text': [
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
      { key: 'enableShadows', label: 'Enable Shadows', type: 'boolean', defaultValue: true },
      { key: 'enableOnHover', label: 'Enable On Hover', type: 'boolean', defaultValue: false }
    ],
    'click-spark': [
      { key: 'sparkColor', label: 'Spark Color', type: 'color', defaultValue: '#ffffff' },
      { key: 'sparkCount', label: 'Spark Count', type: 'number', defaultValue: 12, min: 1, max: 50, step: 1 },
      { key: 'sparkRadius', label: 'Spark Radius', type: 'number', defaultValue: 30, min: 10, max: 100, step: 5 }
    ],
    'crosshair': [
      { key: 'color', label: 'Color', type: 'color', defaultValue: 'rgba(255, 255, 255, 0.5)' }
    ],
    'blob-cursor': [
      { key: 'blobType', label: 'Blob Type', type: 'select', defaultValue: 'circle', options: ['circle', 'square'] },
      { key: 'fillColor', label: 'Fill Color', type: 'color', defaultValue: 'rgba(255, 255, 255, 0.3)' },
      { key: 'trailCount', label: 'Trail Count', type: 'number', defaultValue: 3, min: 0, max: 10, step: 1 }
    ],
    'circular-text': [
      { key: 'spinDuration', label: 'Spin Duration (s)', type: 'number', defaultValue: 20, min: 1, max: 60, step: 1 },
      { key: 'onHover', label: 'On Hover', type: 'select', defaultValue: 'speedUp', options: ['speedUp', 'slowDown', 'pause', 'goBonkers'] }
    ],
    'bounce-cards': [
      { key: 'containerWidth', label: 'Container Width', type: 'number', defaultValue: 600, min: 200, max: 1200, step: 50 },
      { key: 'containerHeight', label: 'Container Height', type: 'number', defaultValue: 400, min: 200, max: 800, step: 50 }
    ],
    'spotlight-card': [
      { key: 'spotlightColor', label: 'Spotlight Color', type: 'color', defaultValue: 'rgba(255, 255, 255, 0.15)' }
    ],
    'text-cursor': [
      { key: 'text', label: 'Text', type: 'text', defaultValue: '✨' },
      { key: 'spacing', label: 'Spacing', type: 'number', defaultValue: 80, min: 20, max: 200, step: 10 },
      { key: 'maxPoints', label: 'Max Points', type: 'number', defaultValue: 8, min: 1, max: 20, step: 1 }
    ],
    'noise': [
      { key: 'patternAlpha', label: 'Pattern Alpha', type: 'number', defaultValue: 20, min: 0, max: 100, step: 5 },
      { key: 'patternRefreshInterval', label: 'Refresh Interval (s)', type: 'number', defaultValue: 3, min: 0.5, max: 10, step: 0.5 }
    ],
    'curved-loop': [
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 2, min: 0.5, max: 10, step: 0.5 },
      { key: 'curveAmount', label: 'Curve Amount', type: 'number', defaultValue: 200, min: 0, max: 500, step: 10 },
      { key: 'interactive', label: 'Interactive', type: 'boolean', defaultValue: true }
    ],
    'star-border': [
      { key: 'color', label: 'Color', type: 'color', defaultValue: 'rgba(255, 255, 255, 0.8)' },
      { key: 'speed', label: 'Speed', type: 'text', defaultValue: '4s' },
      { key: 'thickness', label: 'Thickness', type: 'number', defaultValue: 2, min: 1, max: 10, step: 1 }
    ],
    'target-cursor': [],
    'fuzzy-text': [
      { key: 'enableHover', label: 'Enable Hover', type: 'boolean', defaultValue: true },
      { key: 'baseIntensity', label: 'Base Intensity', type: 'number', defaultValue: 0.15, min: 0, max: 1, step: 0.05 },
      { key: 'hoverIntensity', label: 'Hover Intensity', type: 'number', defaultValue: 0.4, min: 0, max: 1, step: 0.05 }
    ],
    'scrambled-text': [
      { key: 'radius', label: 'Radius', type: 'number', defaultValue: 150, min: 0, max: 500, step: 10 },
      { key: 'duration', label: 'Duration (s)', type: 'number', defaultValue: 1.2, min: 0.1, max: 5, step: 0.1 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.5, min: 0.1, max: 2, step: 0.1 }
    ],
    'falling-text': [
      { key: 'trigger', label: 'Trigger', type: 'select', defaultValue: 'auto', options: ['auto', 'hover', 'click'] },
      { key: 'gravity', label: 'Gravity', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 }
    ],
    'shuffle': [
      { key: 'shuffleDirection', label: 'Direction', type: 'select', defaultValue: 'right', options: ['left', 'right'] },
      { key: 'duration', label: 'Duration (s)', type: 'number', defaultValue: 0.35, min: 0.1, max: 2, step: 0.05 },
      { key: 'stagger', label: 'Stagger', type: 'number', defaultValue: 0.03, min: 0, max: 0.5, step: 0.01 }
    ],
    'ghost-cursor': [
      { key: 'trailLength', label: 'Trail Length', type: 'number', defaultValue: 50, min: 10, max: 200, step: 10 },
      { key: 'inertia', label: 'Inertia', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
      { key: 'grainIntensity', label: 'Grain Intensity', type: 'number', defaultValue: 0.05, min: 0, max: 1, step: 0.05 },
      { key: 'bloomStrength', label: 'Bloom Strength', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.05 },
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#B19EEF' },
      { key: 'brightness', label: 'Brightness', type: 'number', defaultValue: 1, min: 0, max: 2, step: 0.1 }
    ],
    'floating-lines': [
      { key: 'animationSpeed', label: 'Animation Speed', type: 'number', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
      { key: 'interactive', label: 'Interactive', type: 'boolean', defaultValue: true },
      { key: 'parallax', label: 'Parallax', type: 'boolean', defaultValue: true },
      { key: 'parallaxStrength', label: 'Parallax Strength', type: 'number', defaultValue: 0.2, min: 0, max: 1, step: 0.05 },
      { key: 'bendRadius', label: 'Bend Radius', type: 'number', defaultValue: 5.0, min: 0, max: 20, step: 0.5 },
      { key: 'bendStrength', label: 'Bend Strength', type: 'number', defaultValue: -0.5, min: -2, max: 2, step: 0.1 },
      { key: 'mouseDamping', label: 'Mouse Damping', type: 'number', defaultValue: 0.05, min: 0.01, max: 0.5, step: 0.01 },
      { key: 'topLineCount', label: 'Top Line Count', type: 'number', defaultValue: 6, min: 0, max: 20, step: 1 },
      { key: 'middleLineCount', label: 'Middle Line Count', type: 'number', defaultValue: 8, min: 0, max: 20, step: 1 },
      { key: 'bottomLineCount', label: 'Bottom Line Count', type: 'number', defaultValue: 6, min: 0, max: 20, step: 1 },
      { key: 'topLineDistance', label: 'Top Line Distance', type: 'number', defaultValue: 5, min: 1, max: 20, step: 0.5 },
      { key: 'middleLineDistance', label: 'Middle Line Distance', type: 'number', defaultValue: 4, min: 1, max: 20, step: 0.5 },
      { key: 'bottomLineDistance', label: 'Bottom Line Distance', type: 'number', defaultValue: 5, min: 1, max: 20, step: 0.5 }
    ],
    'squares': [
      { key: 'direction', label: 'Direction', type: 'select', defaultValue: 'right', options: ['right', 'left', 'up', 'down', 'diagonal'] },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 1, min: 0.1, max: 10, step: 0.1 },
      { key: 'borderColor', label: 'Border Color', type: 'color', defaultValue: '#999' },
      { key: 'squareSize', label: 'Square Size', type: 'number', defaultValue: 40, min: 10, max: 100, step: 5 },
      { key: 'hoverFillColor', label: 'Hover Fill Color', type: 'color', defaultValue: '#222' }
    ],
    'waves': [
      { key: 'lineColor', label: 'Line Color', type: 'color', defaultValue: 'black' },
      { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: 'transparent' },
      { key: 'waveSpeedX', label: 'Wave Speed X', type: 'number', defaultValue: 0.0125, min: 0, max: 0.1, step: 0.001 },
      { key: 'waveSpeedY', label: 'Wave Speed Y', type: 'number', defaultValue: 0.005, min: 0, max: 0.1, step: 0.001 },
      { key: 'waveAmpX', label: 'Wave Amplitude X', type: 'number', defaultValue: 32, min: 0, max: 100, step: 1 },
      { key: 'waveAmpY', label: 'Wave Amplitude Y', type: 'number', defaultValue: 16, min: 0, max: 100, step: 1 }
    ],
    'dot-grid': [
      { key: 'dotSize', label: 'Dot Size', type: 'number', defaultValue: 16, min: 4, max: 32, step: 2 },
      { key: 'gap', label: 'Gap', type: 'number', defaultValue: 32, min: 8, max: 64, step: 4 },
      { key: 'baseColor', label: 'Base Color', type: 'color', defaultValue: '#5227FF' },
      { key: 'activeColor', label: 'Active Color', type: 'color', defaultValue: '#5227FF' },
      { key: 'proximity', label: 'Proximity', type: 'number', defaultValue: 150, min: 50, max: 300, step: 10 },
      { key: 'speedTrigger', label: 'Speed Trigger', type: 'number', defaultValue: 100, min: 0, max: 500, step: 10 },
      { key: 'shockRadius', label: 'Shock Radius', type: 'number', defaultValue: 250, min: 50, max: 500, step: 10 },
      { key: 'shockStrength', label: 'Shock Strength', type: 'number', defaultValue: 5, min: 1, max: 20, step: 1 },
      { key: 'maxSpeed', label: 'Max Speed', type: 'number', defaultValue: 5000, min: 1000, max: 10000, step: 500 },
      { key: 'resistance', label: 'Resistance', type: 'number', defaultValue: 750, min: 100, max: 2000, step: 50 },
      { key: 'returnDuration', label: 'Return Duration', type: 'number', defaultValue: 1.5, min: 0.5, max: 5, step: 0.1 }
    ],
    'grid-motion': [
      { key: 'gradientColor', label: 'Gradient Color', type: 'color', defaultValue: '#000000' }
    ],
    'aurora': [
      { key: 'colorStops', label: 'Color Stops', type: 'text', defaultValue: '#5227FF,#7cff67,#5227FF' },
      { key: 'amplitude', label: 'Amplitude', type: 'number', defaultValue: 1.0, min: 0.1, max: 3.0, step: 0.1 },
      { key: 'blend', label: 'Blend', type: 'number', defaultValue: 0.5, min: 0.1, max: 1.0, step: 0.1 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 1.0, min: 0.1, max: 5.0, step: 0.1 }
    ],
    'beams': [
      { key: 'lightColor', label: 'Light Color', type: 'color', defaultValue: '#ffffff' },
      { key: 'beamWidth', label: 'Beam Width', type: 'number', defaultValue: 3, min: 0.1, max: 10, step: 0.1 },
      { key: 'beamHeight', label: 'Beam Height', type: 'number', defaultValue: 30, min: 1, max: 25, step: 1 },
      { key: 'beamNumber', label: 'Beam Count', type: 'number', defaultValue: 20, min: 1, max: 50, step: 1 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 2, min: 0.1, max: 10, step: 0.1 },
      { key: 'noiseIntensity', label: 'Noise Intensity', type: 'number', defaultValue: 1.75, min: 0, max: 5, step: 0.05 },
      { key: 'scale', label: 'Noise Scale', type: 'number', defaultValue: 0.2, min: 0.01, max: 1, step: 0.01 },
      { key: 'rotation', label: 'Rotation', type: 'number', defaultValue: 30, min: 0, max: 360, step: 1 }
    ],
    'plasma': [
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#B19EEF' },
      { key: 'direction', label: 'Direction', type: 'select', defaultValue: 'forward', options: ['forward', 'reverse', 'pingpong'] },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 1.0, min: 0.1, max: 3.0, step: 0.1 },
      { key: 'scale', label: 'Scale', type: 'number', defaultValue: 1.0, min: 0.5, max: 3.0, step: 0.1 },
      { key: 'opacity', label: 'Opacity', type: 'number', defaultValue: 1.0, min: 0.1, max: 1.0, step: 0.1 },
      { key: 'mouseInteractive', label: 'Mouse Interactive', type: 'boolean', defaultValue: false }
    ],
    'orb': [
      { key: 'hue', label: 'Hue Shift', type: 'number', defaultValue: 0, min: 0, max: 360, step: 1 },
      { key: 'hoverIntensity', label: 'Hover Intensity', type: 'number', defaultValue: 2, min: 0, max: 5, step: 0.01 },
      { key: 'rotateOnHover', label: 'Rotate On Hover', type: 'boolean', defaultValue: true },
      { key: 'forceHoverState', label: 'Force Hover State', type: 'boolean', defaultValue: false }
    ],
    'particles': [
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#ffffff' },
      { key: 'particleCount', label: 'Count', type: 'number', defaultValue: 200, min: 100, max: 1000, step: 100 },
      { key: 'particleSpread', label: 'Spread', type: 'number', defaultValue: 10, min: 10, max: 100, step: 10 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.1, min: 0, max: 2, step: 0.1 },
      { key: 'particleBaseSize', label: 'Base Size', type: 'number', defaultValue: 100, min: 100, max: 1000, step: 100 },
      { key: 'moveParticlesOnHover', label: 'Mouse Interaction', type: 'boolean', defaultValue: true },
      { key: 'alphaParticles', label: 'Particle Transparency', type: 'boolean', defaultValue: false },
      { key: 'disableRotation', label: 'Disable Rotation', type: 'boolean', defaultValue: false }
    ],
    'ripple-grid': [
      { key: 'gridColor', label: 'Grid Color', type: 'color', defaultValue: '#5227FF' },
      { key: 'rippleIntensity', label: 'Ripple Intensity', type: 'number', defaultValue: 0.05, min: 0, max: 0.3, step: 0.01 },
      { key: 'gridSize', label: 'Grid Size', type: 'number', defaultValue: 10.0, min: 5, max: 30, step: 1 },
      { key: 'gridThickness', label: 'Grid Thickness', type: 'number', defaultValue: 15.0, min: 5, max: 50, step: 1 },
      { key: 'fadeDistance', label: 'Fade Distance', type: 'number', defaultValue: 1.5, min: 0.5, max: 3, step: 0.1 },
      { key: 'vignetteStrength', label: 'Vignette Strength', type: 'number', defaultValue: 2.0, min: 0.5, max: 5, step: 0.1 },
      { key: 'glowIntensity', label: 'Glow Intensity', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.05 },
      { key: 'opacity', label: 'Opacity', type: 'number', defaultValue: 1.0, min: 0, max: 1, step: 0.05 },
      { key: 'gridRotation', label: 'Grid Rotation', type: 'number', defaultValue: 0, min: 0, max: 360, step: 1 },
      { key: 'mouseInteractionRadius', label: 'Mouse Interaction Radius', type: 'number', defaultValue: 0.8, min: 0.2, max: 2, step: 0.1 },
      { key: 'mouseInteraction', label: 'Mouse Interaction', type: 'boolean', defaultValue: true },
      { key: 'enableRainbow', label: 'Enable Rainbow', type: 'boolean', defaultValue: false }
    ],
    'dither': [
      { key: 'waveColorR', label: 'Red', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
      { key: 'waveColorG', label: 'Green', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
      { key: 'waveColorB', label: 'Blue', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
      { key: 'colorNum', label: 'Color Intensity', type: 'number', defaultValue: 4, min: 2.5, max: 40, step: 0.1 },
      { key: 'waveAmplitude', label: 'Wave Amplitude', type: 'number', defaultValue: 0.3, min: 0, max: 1, step: 0.01 },
      { key: 'waveFrequency', label: 'Wave Frequency', type: 'number', defaultValue: 3, min: 0, max: 10, step: 0.1 },
      { key: 'disableAnimation', label: 'Disable Animation', type: 'boolean', defaultValue: false },
      { key: 'waveSpeed', label: 'Wave Speed', type: 'number', defaultValue: 0.05, min: 0, max: 0.1, step: 0.01 },
      { key: 'enableMouseInteraction', label: 'Mouse Interaction', type: 'boolean', defaultValue: true },
      { key: 'mouseRadius', label: 'Mouse Radius', type: 'number', defaultValue: 0.3, min: 0, max: 2, step: 0.1 }
    ],
    'galaxy': [
      { key: 'mouseInteraction', label: 'Mouse Interaction', type: 'boolean', defaultValue: true },
      { key: 'mouseRepulsion', label: 'Mouse Repulsion', type: 'boolean', defaultValue: true },
      { key: 'density', label: 'Density', type: 'number', defaultValue: 1, min: 0.1, max: 3, step: 0.1 },
      { key: 'glowIntensity', label: 'Glow Intensity', type: 'number', defaultValue: 0.3, min: 0, max: 1, step: 0.1 },
      { key: 'saturation', label: 'Saturation', type: 'number', defaultValue: 0.0, min: 0, max: 1, step: 0.1 },
      { key: 'hueShift', label: 'Hue Shift', type: 'number', defaultValue: 140, min: 0, max: 360, step: 10 },
      { key: 'twinkleIntensity', label: 'Twinkle Intensity', type: 'number', defaultValue: 0.3, min: 0, max: 1, step: 0.1 },
      { key: 'rotationSpeed', label: 'Rotation Speed', type: 'number', defaultValue: 0.1, min: 0, max: 0.5, step: 0.05 },
      { key: 'repulsionStrength', label: 'Repulsion Strength', type: 'number', defaultValue: 2, min: 0, max: 10, step: 0.5 },
      { key: 'autoCenterRepulsion', label: 'Auto Center Repulsion', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1 },
      { key: 'starSpeed', label: 'Star Speed', type: 'number', defaultValue: 0.5, min: 0.1, max: 2, step: 0.1 },
      { key: 'speed', label: 'Animation Speed', type: 'number', defaultValue: 1.0, min: 0.1, max: 3, step: 0.1 }
    ],
    'lightning': [
      { key: 'hue', label: 'Hue', type: 'number', defaultValue: 260, min: 0, max: 360, step: 1 },
      { key: 'xOffset', label: 'X Offset', type: 'number', defaultValue: 0, min: -2, max: 2, step: 0.1 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 1, min: 0.5, max: 2, step: 0.1 },
      { key: 'intensity', label: 'Intensity', type: 'number', defaultValue: 1, min: 0.1, max: 2, step: 0.1 },
      { key: 'size', label: 'Size', type: 'number', defaultValue: 1, min: 0.1, max: 3, step: 0.1 }
    ],
    'balatro': [
      { key: 'color1', label: 'Color 1', type: 'color', defaultValue: '#DE443B' },
      { key: 'color2', label: 'Color 2', type: 'color', defaultValue: '#006BB4' },
      { key: 'color3', label: 'Color 3', type: 'color', defaultValue: '#162325' },
      { key: 'pixelFilter', label: 'Pixelation', type: 'number', defaultValue: 745, min: 0, max: 2000, step: 10 },
      { key: 'mouseInteraction', label: 'Mouse Interaction', type: 'boolean', defaultValue: true },
      { key: 'isRotate', label: 'Rotate', type: 'boolean', defaultValue: false }
    ],
    'color-bends': [
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#ff6b6b' },
      { key: 'rotation', label: 'Rotation (deg)', type: 'number', defaultValue: 0, min: -180, max: 180, step: 1 },
      { key: 'autoRotate', label: 'Auto Rotate (deg/s)', type: 'number', defaultValue: 0, min: -5, max: 5, step: 1 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.2, min: 0, max: 1, step: 0.01 },
      { key: 'scale', label: 'Scale', type: 'number', defaultValue: 1, min: 0.2, max: 5, step: 0.1 },
      { key: 'frequency', label: 'Frequency', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 },
      { key: 'warpStrength', label: 'Warp Strength', type: 'number', defaultValue: 1, min: 0, max: 1, step: 0.05 },
      { key: 'mouseInfluence', label: 'Mouse Influence', type: 'number', defaultValue: 1, min: 0, max: 2, step: 0.05 },
      { key: 'parallax', label: 'Parallax', type: 'number', defaultValue: 0.5, min: 0, max: 2, step: 0.05 },
      { key: 'noise', label: 'Noise', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.01 }
    ],
    'light-rays': [
      { key: 'raysColor', label: 'Rays Color', type: 'color', defaultValue: '#ffffff' },
      { key: 'raysOrigin', label: 'Rays Origin', type: 'select', defaultValue: 'top-center', options: ['top-center', 'top-left', 'top-right', 'right', 'left', 'bottom-center', 'bottom-right', 'bottom-left'] },
      { key: 'raysSpeed', label: 'Rays Speed', type: 'number', defaultValue: 1, min: 0.1, max: 3, step: 0.1 },
      { key: 'lightSpread', label: 'Light Spread', type: 'number', defaultValue: 0.5, min: 0.1, max: 2, step: 0.1 },
      { key: 'rayLength', label: 'Ray Length', type: 'number', defaultValue: 3.0, min: 0.5, max: 3, step: 0.1 },
      { key: 'fadeDistance', label: 'Fade Distance', type: 'number', defaultValue: 1.0, min: 0.5, max: 2, step: 0.1 },
      { key: 'saturation', label: 'Saturation', type: 'number', defaultValue: 1.0, min: 0, max: 2, step: 0.1 },
      { key: 'mouseInfluence', label: 'Mouse Influence', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.1 },
      { key: 'noiseAmount', label: 'Noise Amount', type: 'number', defaultValue: 0.0, min: 0, max: 0.5, step: 0.01 },
      { key: 'distortion', label: 'Distortion', type: 'number', defaultValue: 0.0, min: 0, max: 1, step: 0.1 },
      { key: 'pulsating', label: 'Pulsating', type: 'boolean', defaultValue: false }
    ],
    'ballpit': [
      { key: 'count', label: 'Ball Count', type: 'number', defaultValue: 200, min: 50, max: 500, step: 10 },
      { key: 'gravity', label: 'Gravity', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
      { key: 'friction', label: 'Friction', type: 'number', defaultValue: 0.9975, min: 0.9, max: 1, step: 0.001 },
      { key: 'wallBounce', label: 'Wall Bounce', type: 'number', defaultValue: 0.95, min: 0.5, max: 1, step: 0.05 },
      { key: 'followCursor', label: 'Follow Cursor', type: 'boolean', defaultValue: true }
    ],
    'dark-veil': [
      { key: 'hueShift', label: 'Hue Shift', type: 'number', defaultValue: 0, min: 0, max: 360, step: 1 },
      { key: 'noiseIntensity', label: 'Noise Intensity', type: 'number', defaultValue: 0, min: 0, max: 0.2, step: 0.01 },
      { key: 'scanlineIntensity', label: 'Scanline Intensity', type: 'number', defaultValue: 0, min: 0, max: 1, step: 0.01 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.5, min: 0, max: 3, step: 0.1 },
      { key: 'scanlineFrequency', label: 'Scanline Frequency', type: 'number', defaultValue: 0, min: 0.5, max: 5, step: 0.1 },
      { key: 'warpAmount', label: 'Warp Amount', type: 'number', defaultValue: 0, min: 0, max: 5, step: 0.1 }
    ],
    'faulty-terminal': [
      { key: 'scale', label: 'Scale', type: 'number', defaultValue: 1.5, min: 1, max: 3, step: 0.1 },
      { key: 'digitSize', label: 'Digit Size', type: 'number', defaultValue: 1.2, min: 0.5, max: 3, step: 0.1 },
      { key: 'timeScale', label: 'Speed', type: 'number', defaultValue: 0.5, min: 0, max: 3, step: 0.1 },
      { key: 'scanlineIntensity', label: 'Scanline Intensity', type: 'number', defaultValue: 0.5, min: 0, max: 2, step: 0.1 },
      { key: 'curvature', label: 'Curvature', type: 'number', defaultValue: 0.1, min: 0, max: 0.5, step: 0.01 },
      { key: 'tint', label: 'Tint Color', type: 'color', defaultValue: '#A7EF9E' },
      { key: 'mouseReact', label: 'Mouse React', type: 'boolean', defaultValue: true },
      { key: 'mouseStrength', label: 'Mouse Strength', type: 'number', defaultValue: 0.5, min: 0, max: 2, step: 0.1 },
      { key: 'noiseAmp', label: 'Noise Amplitude', type: 'number', defaultValue: 1, min: 0.5, max: 1, step: 0.1 },
      { key: 'brightness', label: 'Brightness', type: 'number', defaultValue: 0.6, min: 0.1, max: 1, step: 0.1 }
    ],
    'gradient-blinds': [
      { key: 'gradientColors', label: 'Gradient Colors (comma-separated hex)', type: 'text', defaultValue: '#FF9FFC,#5227FF' },
      { key: 'angle', label: 'Angle', type: 'number', defaultValue: 0, min: 0, max: 360, step: 1 },
      { key: 'noise', label: 'Noise', type: 'number', defaultValue: 0.3, min: 0, max: 1, step: 0.05 },
      { key: 'blindCount', label: 'Blind Count', type: 'number', defaultValue: 16, min: 1, max: 64, step: 1 },
      { key: 'blindMinWidth', label: 'Blind Min Width', type: 'number', defaultValue: 60, min: 0, max: 200, step: 10 },
      { key: 'mouseDampening', label: 'Mouse Dampening', type: 'number', defaultValue: 0.15, min: 0, max: 1, step: 0.01 },
      { key: 'mirrorGradient', label: 'Mirror Gradient', type: 'boolean', defaultValue: false },
      { key: 'spotlightRadius', label: 'Spotlight Radius', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
      { key: 'spotlightSoftness', label: 'Spotlight Softness', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 },
      { key: 'spotlightOpacity', label: 'Spotlight Opacity', type: 'number', defaultValue: 1, min: 0, max: 1, step: 0.05 },
      { key: 'distortAmount', label: 'Distort Amount', type: 'number', defaultValue: 0, min: 0, max: 1, step: 0.05 },
      { key: 'shineDirection', label: 'Shine Direction', type: 'select', options: ['left', 'right'], defaultValue: 'left' },
      { key: 'mixBlendMode', label: 'Mix Blend Mode', type: 'select', options: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'], defaultValue: 'lighten' }
    ],
    'grid-distortion': [
      { key: 'grid', label: 'Grid Size', type: 'number', defaultValue: 15, min: 5, max: 50, step: 1 },
      { key: 'mouse', label: 'Mouse Influence', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.01 },
      { key: 'strength', label: 'Strength', type: 'number', defaultValue: 0.15, min: 0, max: 1, step: 0.01 },
      { key: 'relaxation', label: 'Relaxation', type: 'number', defaultValue: 0.9, min: 0, max: 1, step: 0.01 },
      { key: 'imageSrc', label: 'Image Source (URL)', type: 'text', defaultValue: '' }
    ],
    'grid-scan': [
      { key: 'sensitivity', label: 'Sensitivity', type: 'number', defaultValue: 0.55, min: 0, max: 1, step: 0.05 },
      { key: 'lineThickness', label: 'Line Thickness', type: 'number', defaultValue: 1, min: 0.5, max: 5, step: 0.5 },
      { key: 'linesColor', label: 'Lines Color', type: 'color', defaultValue: '#392e4e' },
      { key: 'scanColor', label: 'Scan Color', type: 'color', defaultValue: '#FF9FFC' },
      { key: 'scanOpacity', label: 'Scan Opacity', type: 'number', defaultValue: 0.4, min: 0, max: 1, step: 0.05 },
      { key: 'gridScale', label: 'Grid Scale', type: 'number', defaultValue: 0.1, min: 0.01, max: 1, step: 0.01 },
      { key: 'lineStyle', label: 'Line Style', type: 'select', options: ['solid', 'dashed', 'dotted'], defaultValue: 'solid' },
      { key: 'lineJitter', label: 'Line Jitter', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.05 },
      { key: 'scanDirection', label: 'Scan Direction', type: 'select', options: ['forward', 'backward', 'pingpong'], defaultValue: 'pingpong' },
      { key: 'noiseIntensity', label: 'Noise Intensity', type: 'number', defaultValue: 0.01, min: 0, max: 0.1, step: 0.01 },
      { key: 'scanGlow', label: 'Scan Glow', type: 'number', defaultValue: 0.5, min: 0, max: 2, step: 0.1 },
      { key: 'scanSoftness', label: 'Scan Softness', type: 'number', defaultValue: 2, min: 0, max: 10, step: 0.5 },
      { key: 'scanPhaseTaper', label: 'Scan Phase Taper', type: 'number', defaultValue: 0.9, min: 0, max: 1, step: 0.05 },
      { key: 'scanDuration', label: 'Scan Duration', type: 'number', defaultValue: 2.0, min: 0.5, max: 10, step: 0.5 },
      { key: 'scanDelay', label: 'Scan Delay', type: 'number', defaultValue: 2.0, min: 0, max: 10, step: 0.5 },
      { key: 'enableGyro', label: 'Enable Gyro', type: 'boolean', defaultValue: false },
      { key: 'scanOnClick', label: 'Scan On Click', type: 'boolean', defaultValue: false },
      { key: 'snapBackDelay', label: 'Snap Back Delay', type: 'number', defaultValue: 250, min: 0, max: 2000, step: 50 }
    ],
    'iridescence': [
      { key: 'color', label: 'Color (RGB 0-1, comma-separated)', type: 'text', defaultValue: '1,1,1' },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 1.0, min: 0, max: 5, step: 0.1 },
      { key: 'amplitude', label: 'Amplitude', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.05 },
      { key: 'mouseReact', label: 'Mouse React', type: 'boolean', defaultValue: true }
    ],
    'letter-glitch': [
      { key: 'glitchColors', label: 'Glitch Colors (comma-separated hex)', type: 'text', defaultValue: '#2b4539,#61dca3,#61b3dc' },
      { key: 'glitchSpeed', label: 'Glitch Speed (ms)', type: 'number', defaultValue: 50, min: 10, max: 500, step: 10 },
      { key: 'centerVignette', label: 'Center Vignette', type: 'boolean', defaultValue: false },
      { key: 'outerVignette', label: 'Outer Vignette', type: 'boolean', defaultValue: true },
      { key: 'smooth', label: 'Smooth', type: 'boolean', defaultValue: true },
      { key: 'characters', label: 'Characters', type: 'text', defaultValue: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789' }
    ],
    'liquid-chrome': [
      { key: 'baseColor', label: 'Base Color (RGB 0-1, comma-separated)', type: 'text', defaultValue: '0.1,0.1,0.1' },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.2, min: 0, max: 2, step: 0.1 },
      { key: 'amplitude', label: 'Amplitude', type: 'number', defaultValue: 0.3, min: 0, max: 1, step: 0.05 },
      { key: 'frequencyX', label: 'Frequency X', type: 'number', defaultValue: 3, min: 0, max: 10, step: 0.5 },
      { key: 'frequencyY', label: 'Frequency Y', type: 'number', defaultValue: 3, min: 0, max: 10, step: 0.5 },
      { key: 'interactive', label: 'Interactive', type: 'boolean', defaultValue: true }
    ],
    'threads': [
      { key: 'color', label: 'Color (RGB 0-1, comma-separated)', type: 'text', defaultValue: '1,1,1' },
      { key: 'amplitude', label: 'Amplitude', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 },
      { key: 'distance', label: 'Distance', type: 'number', defaultValue: 0, min: -1, max: 1, step: 0.1 },
      { key: 'enableMouseInteraction', label: 'Enable Mouse Interaction', type: 'boolean', defaultValue: false }
    ],
    'silk': [
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 5, min: 0, max: 20, step: 1 },
      { key: 'scale', label: 'Scale', type: 'number', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#7B7481' },
      { key: 'noiseIntensity', label: 'Noise Intensity', type: 'number', defaultValue: 1.5, min: 0, max: 5, step: 0.1 },
      { key: 'rotation', label: 'Rotation', type: 'number', defaultValue: 0, min: 0, max: 360, step: 1 }
    ],
    'prism': [
      { key: 'height', label: 'Height', type: 'number', defaultValue: 3.5, min: 0.1, max: 10, step: 0.1 },
      { key: 'baseWidth', label: 'Base Width', type: 'number', defaultValue: 5.5, min: 0.1, max: 10, step: 0.1 },
      { key: 'animationType', label: 'Animation Type', type: 'select', options: ['rotate', 'hover', '3drotate'], defaultValue: 'rotate' },
      { key: 'glow', label: 'Glow', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 },
      { key: 'noise', label: 'Noise', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
      { key: 'transparent', label: 'Transparent', type: 'boolean', defaultValue: true },
      { key: 'scale', label: 'Scale', type: 'number', defaultValue: 3.6, min: 0.1, max: 10, step: 0.1 },
      { key: 'hueShift', label: 'Hue Shift', type: 'number', defaultValue: 0, min: -180, max: 180, step: 1 },
      { key: 'colorFrequency', label: 'Color Frequency', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 },
      { key: 'hoverStrength', label: 'Hover Strength', type: 'number', defaultValue: 2, min: 0, max: 10, step: 0.1 },
      { key: 'inertia', label: 'Inertia', type: 'number', defaultValue: 0.05, min: 0, max: 1, step: 0.01 },
      { key: 'bloom', label: 'Bloom', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 },
      { key: 'suspendWhenOffscreen', label: 'Suspend When Offscreen', type: 'boolean', defaultValue: false },
      { key: 'timeScale', label: 'Time Scale', type: 'number', defaultValue: 0.5, min: 0, max: 2, step: 0.1 }
    ],
    'prismatic-burst': [
      { key: 'intensity', label: 'Intensity', type: 'number', defaultValue: 2, min: 0, max: 10, step: 0.1 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.5, min: 0, max: 2, step: 0.1 },
      { key: 'animationType', label: 'Animation Type', type: 'select', options: ['rotate', 'rotate3d', 'hover'], defaultValue: 'rotate3d' },
      { key: 'colors', label: 'Colors (comma-separated hex)', type: 'text', defaultValue: '' },
      { key: 'distort', label: 'Distort', type: 'number', defaultValue: 0, min: 0, max: 50, step: 1 },
      { key: 'paused', label: 'Paused', type: 'boolean', defaultValue: false },
      { key: 'hoverDampness', label: 'Hover Dampness', type: 'number', defaultValue: 0, min: 0, max: 1, step: 0.1 },
      { key: 'rayCount', label: 'Ray Count', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1 },
      { key: 'mixBlendMode', label: 'Mix Blend Mode', type: 'select', options: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'], defaultValue: 'lighten' }
    ],
    'pixel-blast': [
      { key: 'variant', label: 'Variant', type: 'select', options: ['square', 'circle', 'triangle', 'diamond'], defaultValue: 'square' },
      { key: 'pixelSize', label: 'Pixel Size', type: 'number', defaultValue: 3, min: 1, max: 20, step: 1 },
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#B19EEF' },
      { key: 'patternScale', label: 'Pattern Scale', type: 'number', defaultValue: 2, min: 0.1, max: 10, step: 0.1 },
      { key: 'patternDensity', label: 'Pattern Density', type: 'number', defaultValue: 1, min: 0, max: 2, step: 0.1 },
      { key: 'pixelSizeJitter', label: 'Pixel Size Jitter', type: 'number', defaultValue: 0, min: 0, max: 1, step: 0.05 },
      { key: 'enableRipples', label: 'Enable Ripples', type: 'boolean', defaultValue: true },
      { key: 'rippleIntensityScale', label: 'Ripple Intensity Scale', type: 'number', defaultValue: 1, min: 0, max: 5, step: 0.1 },
      { key: 'rippleThickness', label: 'Ripple Thickness', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.05 },
      { key: 'rippleSpeed', label: 'Ripple Speed', type: 'number', defaultValue: 0.3, min: 0, max: 2, step: 0.1 },
      { key: 'autoPauseOffscreen', label: 'Auto Pause Offscreen', type: 'boolean', defaultValue: true },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.5, min: 0, max: 2, step: 0.1 },
      { key: 'transparent', label: 'Transparent', type: 'boolean', defaultValue: true },
      { key: 'edgeFade', label: 'Edge Fade', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.05 }
    ],
    'decrypted-text': [
      { key: 'speed', label: 'Speed (ms)', type: 'number', defaultValue: 50, min: 10, max: 500, step: 10 },
      { key: 'maxIterations', label: 'Max Iterations', type: 'number', defaultValue: 10, min: 1, max: 50, step: 1 },
      { key: 'sequential', label: 'Sequential', type: 'boolean', defaultValue: true },
      { key: 'revealDirection', label: 'Reveal Direction', type: 'select', defaultValue: 'start', options: ['start', 'end', 'center'] }
    ],
    'scroll-float': [
      { key: 'animationDuration', label: 'Animation Duration (s)', type: 'number', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
      { key: 'stagger', label: 'Stagger', type: 'number', defaultValue: 0.03, min: 0, max: 0.5, step: 0.01 }
    ],
    'cubes': [
      { key: 'gridSize', label: 'Grid Size', type: 'number', defaultValue: 10, min: 5, max: 20, step: 1 },
      { key: 'maxAngle', label: 'Max Angle', type: 'number', defaultValue: 45, min: 0, max: 90, step: 5 },
      { key: 'radius', label: 'Radius', type: 'number', defaultValue: 3, min: 1, max: 10, step: 0.5 },
      { key: 'autoAnimate', label: 'Auto Animate', type: 'boolean', defaultValue: true },
      { key: 'rippleOnClick', label: 'Ripple On Click', type: 'boolean', defaultValue: true }
    ],
    'scroll-velocity': [
      { key: 'velocity', label: 'Velocity', type: 'number', defaultValue: 100, min: 10, max: 500, step: 10 },
      { key: 'damping', label: 'Damping', type: 'number', defaultValue: 50, min: 10, max: 200, step: 10 },
      { key: 'stiffness', label: 'Stiffness', type: 'number', defaultValue: 400, min: 100, max: 1000, step: 50 },
      { key: 'numCopies', label: 'Num Copies', type: 'number', defaultValue: 6, min: 2, max: 20, step: 1 }
    ],
    'gradual-blur': [
      { key: 'position', label: 'Position', type: 'select', defaultValue: 'bottom', options: ['top', 'bottom', 'left', 'right'] },
      { key: 'strength', label: 'Strength', type: 'number', defaultValue: 2, min: 0, max: 10, step: 0.5 },
      { key: 'height', label: 'Height', type: 'text', defaultValue: '6rem' },
      { key: 'divCount', label: 'Div Count', type: 'number', defaultValue: 5, min: 2, max: 20, step: 1 },
      { key: 'exponential', label: 'Exponential', type: 'boolean', defaultValue: false }
    ],
    'magnet-lines': [
      { key: 'rows', label: 'Rows', type: 'number', defaultValue: 9, min: 3, max: 20, step: 1 },
      { key: 'columns', label: 'Columns', type: 'number', defaultValue: 9, min: 3, max: 20, step: 1 },
      { key: 'baseAngle', label: 'Base Angle', type: 'number', defaultValue: -10, min: -90, max: 90, step: 5 },
      { key: 'lineColor', label: 'Line Color', type: 'color', defaultValue: '#efefef' }
    ],
    'image-trail': [
      { key: 'variant', label: 'Variant', type: 'number', defaultValue: 1, min: 1, max: 8, step: 1 }
    ],
    'pixel-transition': [
      { key: 'gridSize', label: 'Grid Size', type: 'number', defaultValue: 7, min: 3, max: 20, step: 1 },
      { key: 'pixelColor', label: 'Pixel Color', type: 'color', defaultValue: 'currentColor' },
      { key: 'animationStepDuration', label: 'Animation Step Duration', type: 'number', defaultValue: 0.3, min: 0.1, max: 2, step: 0.1 },
      { key: 'once', label: 'Once', type: 'boolean', defaultValue: false }
    ],
    'logo-loop': [
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 120, min: 10, max: 500, step: 10 },
      { key: 'direction', label: 'Direction', type: 'select', defaultValue: 'left', options: ['left', 'right', 'up', 'down'] },
      { key: 'logoHeight', label: 'Logo Height', type: 'number', defaultValue: 28, min: 10, max: 100, step: 2 },
      { key: 'gap', label: 'Gap', type: 'number', defaultValue: 32, min: 0, max: 100, step: 4 },
      { key: 'pauseOnHover', label: 'Pause On Hover', type: 'boolean', defaultValue: true },
      { key: 'fadeOut', label: 'Fade Out', type: 'boolean', defaultValue: false },
      { key: 'scaleOnHover', label: 'Scale On Hover', type: 'boolean', defaultValue: false }
    ],
    'sticker-peel': [
      { key: 'rotate', label: 'Rotate', type: 'number', defaultValue: 30, min: 0, max: 360, step: 5 },
      { key: 'peelBackHoverPct', label: 'Peel Back Hover %', type: 'number', defaultValue: 30, min: 0, max: 100, step: 5 },
      { key: 'peelBackActivePct', label: 'Peel Back Active %', type: 'number', defaultValue: 40, min: 0, max: 100, step: 5 },
      { key: 'width', label: 'Width', type: 'number', defaultValue: 200, min: 50, max: 500, step: 10 },
      { key: 'shadowIntensity', label: 'Shadow Intensity', type: 'number', defaultValue: 0.6, min: 0, max: 1, step: 0.1 },
      { key: 'lightingIntensity', label: 'Lighting Intensity', type: 'number', defaultValue: 0.1, min: 0, max: 1, step: 0.05 }
    ],
    'shape-blur': [
      { key: 'variation', label: 'Variation', type: 'number', defaultValue: 0, min: 0, max: 3, step: 1 },
      { key: 'shapeSize', label: 'Shape Size', type: 'number', defaultValue: 1.2, min: 0.5, max: 3, step: 0.1 },
      { key: 'roundness', label: 'Roundness', type: 'number', defaultValue: 0.4, min: 0, max: 1, step: 0.1 },
      { key: 'borderSize', label: 'Border Size', type: 'number', defaultValue: 0.05, min: 0, max: 0.5, step: 0.01 },
      { key: 'circleSize', label: 'Circle Size', type: 'number', defaultValue: 0.3, min: 0.1, max: 1, step: 0.1 },
      { key: 'circleEdge', label: 'Circle Edge', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1 }
    ],
    'pixel-trail': [
      { key: 'gridSize', label: 'Grid Size', type: 'number', defaultValue: 40, min: 10, max: 100, step: 5 },
      { key: 'trailSize', label: 'Trail Size', type: 'number', defaultValue: 0.1, min: 0.05, max: 1, step: 0.05 },
      { key: 'maxAge', label: 'Max Age', type: 'number', defaultValue: 250, min: 50, max: 1000, step: 50 },
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#ffffff' }
    ],
    'laser-flow': [],
    'ribbons': [
      { key: 'baseSpring', label: 'Base Spring', type: 'number', defaultValue: 0.03, min: 0.01, max: 0.1, step: 0.01 },
      { key: 'baseFriction', label: 'Base Friction', type: 'number', defaultValue: 0.9, min: 0.5, max: 1, step: 0.05 },
      { key: 'baseThickness', label: 'Base Thickness', type: 'number', defaultValue: 30, min: 10, max: 100, step: 5 },
      { key: 'pointCount', label: 'Point Count', type: 'number', defaultValue: 50, min: 10, max: 200, step: 10 },
      { key: 'speedMultiplier', label: 'Speed Multiplier', type: 'number', defaultValue: 0.6, min: 0.1, max: 2, step: 0.1 },
      { key: 'enableFade', label: 'Enable Fade', type: 'boolean', defaultValue: false }
    ],
    'meta-balls': [
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#ffffff' },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.3, min: 0.1, max: 2, step: 0.1 },
      { key: 'animationSize', label: 'Animation Size', type: 'number', defaultValue: 30, min: 10, max: 100, step: 5 },
      { key: 'ballCount', label: 'Ball Count', type: 'number', defaultValue: 15, min: 5, max: 50, step: 5 },
      { key: 'cursorBallSize', label: 'Cursor Ball Size', type: 'number', defaultValue: 3, min: 1, max: 10, step: 0.5 },
      { key: 'enableTransparency', label: 'Enable Transparency', type: 'boolean', defaultValue: true }
    ],
    'metallic-paint': [
      { key: 'patternScale', label: 'Pattern Scale', type: 'number', defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
      { key: 'refraction', label: 'Refraction', type: 'number', defaultValue: 0.015, min: 0.001, max: 0.1, step: 0.001 },
      { key: 'liquid', label: 'Liquid', type: 'number', defaultValue: 0.07, min: 0.01, max: 0.2, step: 0.01 },
      { key: 'speed', label: 'Speed', type: 'number', defaultValue: 0.3, min: 0.1, max: 1, step: 0.1 }
    ],
    'splash-cursor': [
      { key: 'simResolution', label: 'Sim Resolution', type: 'number', defaultValue: 128, min: 64, max: 256, step: 32 },
      { key: 'densityDissipation', label: 'Density Dissipation', type: 'number', defaultValue: 3.5, min: 1, max: 10, step: 0.5 },
      { key: 'velocityDissipation', label: 'Velocity Dissipation', type: 'number', defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
      { key: 'splatRadius', label: 'Splat Radius', type: 'number', defaultValue: 0.2, min: 0.1, max: 1, step: 0.1 },
      { key: 'splatForce', label: 'Splat Force', type: 'number', defaultValue: 6000, min: 1000, max: 10000, step: 500 }
    ],
    'circular-gallery': [
      { key: 'bend', label: 'Bend', type: 'number', defaultValue: 3, min: -10, max: 10, step: 1 },
      { key: 'borderRadius', label: 'Border Radius', type: 'number', defaultValue: 0.05, min: 0, max: 0.5, step: 0.01 },
      { key: 'scrollSpeed', label: 'Scroll Speed', type: 'number', defaultValue: 2, min: 0.5, max: 5, step: 0.1 },
      { key: 'scrollEase', label: 'Scroll Ease', type: 'number', defaultValue: 0.05, min: 0.01, max: 0.15, step: 0.01 },
      { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#ffffff' }
    ],
    'dome-gallery': [
      { key: 'fit', label: 'Fit', type: 'number', defaultValue: 0.8, min: 0.5, max: 1, step: 0.05 },
      { key: 'minRadius', label: 'Min Radius', type: 'number', defaultValue: 600, min: 300, max: 1000, step: 50 },
      { key: 'maxVerticalRotationDeg', label: 'Max Vertical Rotation', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1 },
      { key: 'segments', label: 'Segments', type: 'number', defaultValue: 34, min: 20, max: 34, step: 2 },
      { key: 'dragDampening', label: 'Drag Dampening', type: 'number', defaultValue: 2, min: 0, max: 5, step: 0.2 },
      { key: 'grayscale', label: 'Grayscale', type: 'boolean', defaultValue: true }
    ],
    'flying-posters': [
      { key: 'planeWidth', label: 'Plane Width', type: 'number', defaultValue: 320, min: 100, max: 800, step: 10 },
      { key: 'planeHeight', label: 'Plane Height', type: 'number', defaultValue: 320, min: 100, max: 800, step: 10 },
      { key: 'distortion', label: 'Distortion', type: 'number', defaultValue: 3, min: 0, max: 10, step: 0.5 },
      { key: 'scrollEase', label: 'Scroll Ease', type: 'number', defaultValue: 0.01, min: 0.001, max: 0.1, step: 0.001 },
      { key: 'cameraFov', label: 'Camera FOV', type: 'number', defaultValue: 45, min: 20, max: 90, step: 1 },
      { key: 'cameraZ', label: 'Camera Z', type: 'number', defaultValue: 20, min: 10, max: 50, step: 1 }
    ],
    'infinite-menu': [],
    'pill-nav': [
      { key: 'baseColor', label: 'Base Color', type: 'color', defaultValue: '#fff' },
      { key: 'pillColor', label: 'Pill Color', type: 'color', defaultValue: '#060010' },
      { key: 'hoveredPillTextColor', label: 'Hovered Pill Text Color', type: 'color', defaultValue: '#060010' },
      { key: 'pillTextColor', label: 'Pill Text Color', type: 'color', defaultValue: '#fff' },
      { key: 'ease', label: 'Ease', type: 'text', defaultValue: 'power3.easeOut' },
      { key: 'initialLoadAnimation', label: 'Initial Load Animation', type: 'boolean', defaultValue: true }
    ],
    'magic-bento': [
      { key: 'textAutoHide', label: 'Text Auto Hide', type: 'boolean', defaultValue: true },
      { key: 'enableStars', label: 'Enable Stars', type: 'boolean', defaultValue: true },
      { key: 'enableSpotlight', label: 'Enable Spotlight', type: 'boolean', defaultValue: true },
      { key: 'enableBorderGlow', label: 'Enable Border Glow', type: 'boolean', defaultValue: true },
      { key: 'spotlightRadius', label: 'Spotlight Radius', type: 'number', defaultValue: 300, min: 100, max: 500, step: 50 },
      { key: 'particleCount', label: 'Particle Count', type: 'number', defaultValue: 12, min: 0, max: 30, step: 1 },
      { key: 'glowColor', label: 'Glow Color', type: 'text', defaultValue: '132, 0, 255' }
    ],
    'masonry': [
      { key: 'ease', label: 'Ease', type: 'text', defaultValue: 'power3.out' },
      { key: 'duration', label: 'Duration', type: 'number', defaultValue: 0.6, min: 0.1, max: 2, step: 0.1 },
      { key: 'stagger', label: 'Stagger', type: 'number', defaultValue: 0.05, min: 0, max: 0.2, step: 0.01 },
      { key: 'animateFrom', label: 'Animate From', type: 'select', defaultValue: 'bottom', options: ['top', 'bottom', 'left', 'right', 'center', 'random'] },
      { key: 'scaleOnHover', label: 'Scale On Hover', type: 'boolean', defaultValue: true },
      { key: 'hoverScale', label: 'Hover Scale', type: 'number', defaultValue: 0.95, min: 0.5, max: 1, step: 0.05 },
      { key: 'blurToFocus', label: 'Blur To Focus', type: 'boolean', defaultValue: true },
      { key: 'colorShiftOnHover', label: 'Color Shift On Hover', type: 'boolean', defaultValue: false }
    ],
    'profile-card': [
      { key: 'name', label: 'Name', type: 'text', defaultValue: 'Javi A. Torres' },
      { key: 'title', label: 'Title', type: 'text', defaultValue: 'Software Engineer' },
      { key: 'handle', label: 'Handle', type: 'text', defaultValue: 'javicodes' },
      { key: 'status', label: 'Status', type: 'text', defaultValue: 'Online' },
      { key: 'enableTilt', label: 'Enable Tilt', type: 'boolean', defaultValue: true },
      { key: 'enableMobileTilt', label: 'Enable Mobile Tilt', type: 'boolean', defaultValue: false },
      { key: 'behindGlowEnabled', label: 'Behind Glow Enabled', type: 'boolean', defaultValue: true }
    ],
    'scroll-stack': [
      { key: 'itemDistance', label: 'Item Distance', type: 'number', defaultValue: 100, min: 50, max: 200, step: 10 },
      { key: 'itemScale', label: 'Item Scale', type: 'number', defaultValue: 0.03, min: 0, max: 0.1, step: 0.01 },
      { key: 'itemStackDistance', label: 'Item Stack Distance', type: 'number', defaultValue: 30, min: 10, max: 100, step: 5 },
      { key: 'baseScale', label: 'Base Scale', type: 'number', defaultValue: 0.85, min: 0.5, max: 1, step: 0.05 },
      { key: 'rotationAmount', label: 'Rotation Amount', type: 'number', defaultValue: 0, min: 0, max: 10, step: 0.5 },
      { key: 'blurAmount', label: 'Blur Amount', type: 'number', defaultValue: 0, min: 0, max: 5, step: 0.5 }
    ],
    'lanyard': [
      { key: 'fov', label: 'FOV', type: 'number', defaultValue: 20, min: 10, max: 90, step: 5 },
      { key: 'transparent', label: 'Transparent', type: 'boolean', defaultValue: true }
    ],
    'model-viewer': [
      { key: 'width', label: 'Width', type: 'number', defaultValue: 400, min: 200, max: 800, step: 50 },
      { key: 'height', label: 'Height', type: 'number', defaultValue: 400, min: 200, max: 800, step: 50 },
      { key: 'defaultRotationX', label: 'Default Rotation X', type: 'number', defaultValue: -50, min: -180, max: 180, step: 5 },
      { key: 'defaultRotationY', label: 'Default Rotation Y', type: 'number', defaultValue: 20, min: -180, max: 180, step: 5 },
      { key: 'defaultZoom', label: 'Default Zoom', type: 'number', defaultValue: 0.5, min: 0.1, max: 2, step: 0.1 },
      { key: 'enableMouseParallax', label: 'Enable Mouse Parallax', type: 'boolean', defaultValue: true },
      { key: 'enableManualRotation', label: 'Enable Manual Rotation', type: 'boolean', defaultValue: true },
      { key: 'enableHoverRotation', label: 'Enable Hover Rotation', type: 'boolean', defaultValue: true },
      { key: 'autoRotate', label: 'Auto Rotate', type: 'boolean', defaultValue: false },
      { key: 'autoRotateSpeed', label: 'Auto Rotate Speed', type: 'number', defaultValue: 0.35, min: 0, max: 2, step: 0.1 }
    ],
    'animated-list': [
      { key: 'showGradients', label: 'Show Gradients', type: 'boolean', defaultValue: true },
      { key: 'enableArrowNavigation', label: 'Enable Arrow Navigation', type: 'boolean', defaultValue: true },
      { key: 'displayScrollbar', label: 'Display Scrollbar', type: 'boolean', defaultValue: true }
    ],
    'counter': [
      { key: 'value', label: 'Value', type: 'number', defaultValue: 2024, min: 0, max: 999999, step: 1 },
      { key: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 100, min: 20, max: 200, step: 5 },
      { key: 'gap', label: 'Gap', type: 'number', defaultValue: 8, min: 0, max: 20, step: 1 },
      { key: 'borderRadius', label: 'Border Radius', type: 'number', defaultValue: 4, min: 0, max: 20, step: 1 },
      { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#ffffff' },
      { key: 'gradientHeight', label: 'Gradient Height', type: 'number', defaultValue: 16, min: 0, max: 50, step: 2 }
    ],
    'true-focus': [
      { key: 'blurAmount', label: 'Blur Amount', type: 'number', defaultValue: 5, min: 0, max: 20, step: 1 },
      { key: 'borderColor', label: 'Border Color', type: 'color', defaultValue: 'green' },
      { key: 'glowColor', label: 'Glow Color', type: 'color', defaultValue: 'rgba(0, 255, 0, 0.6)' },
      { key: 'animationDuration', label: 'Animation Duration (s)', type: 'number', defaultValue: 0.5, min: 0.1, max: 2, step: 0.1 }
    ],
    'variable-proximity': [
      { key: 'radius', label: 'Radius', type: 'number', defaultValue: 50, min: 10, max: 200, step: 10 },
      { key: 'falloff', label: 'Falloff', type: 'select', defaultValue: 'linear', options: ['linear', 'exponential', 'gaussian'] }
    ],
    'split-text': [
      { key: 'splitType', label: 'Split Type', type: 'select', defaultValue: 'chars', options: ['chars', 'words', 'lines', 'chars,words', 'chars,lines', 'words,lines', 'chars,words,lines'] },
      { key: 'tag', label: 'Tag', type: 'select', defaultValue: 'h1', options: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'] },
      { key: 'delay', label: 'Delay (ms)', type: 'number', defaultValue: 100, min: 0, max: 1000, step: 10 },
      { key: 'duration', label: 'Duration (s)', type: 'number', defaultValue: 0.6, min: 0.1, max: 2, step: 0.1 }
    ],
    'text-pressure': [
      { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#FFFFFF' },
      { key: 'minFontSize', label: 'Min Font Size', type: 'number', defaultValue: 24, min: 12, max: 100, step: 2 }
    ],
    'ascii-text': [
      { key: 'containerHeight', label: 'Container Height', type: 'number', defaultValue: 400, min: 200, max: 1000, step: 10 },
      { key: 'asciiFontSize', label: 'ASCII Font Size', type: 'number', defaultValue: 2, min: 1, max: 64, step: 1 },
      { key: 'textFontSize', label: 'Text Font Size', type: 'number', defaultValue: 200, min: 50, max: 2000, step: 10 },
      { key: 'gradientType', label: 'Gradient Type', type: 'select', defaultValue: 'none', options: ['none', 'sunset', 'ocean', 'forest', 'purple', 'fire', 'ice', 'rainbow', 'custom'] },
      { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#fdf9f3' },
      { key: 'customGradientColor1', label: 'Custom Gradient Color 1', type: 'color', defaultValue: '#ff6188' },
      { key: 'customGradientColor2', label: 'Custom Gradient Color 2', type: 'color', defaultValue: '#fc9867' },
      { key: 'customGradientColor3', label: 'Custom Gradient Color 3', type: 'color', defaultValue: '#ffd866' },
      { key: 'enableWaves', label: 'Enable Waves', type: 'boolean', defaultValue: true }
    ],
    'neural-web': [
      { key: 'particleCount', label: 'Particle Count', type: 'number', defaultValue: 250, min: 50, max: 1000, step: 10 },
      { key: 'connectionDistance', label: 'Connection Distance', type: 'number', defaultValue: 250, min: 50, max: 1000, step: 10 },
      { key: 'particleSpeed', label: 'Particle Speed', type: 'number', defaultValue: 4, min: 1, max: 10, step: 1 },
      { key: 'mouseRadius', label: 'Mouse Radius', type: 'number', defaultValue: 200, min: 50, max: 400, step: 10 },
      { key: 'mouseForce', label: 'Mouse Force', type: 'number', defaultValue: 0.5, min: 0.1, max: 2, step: 0.1 },
      { key: 'pulseSpeed', label: 'Pulse Speed', type: 'number', defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
      { key: 'lineOpacity', label: 'Line Opacity', type: 'number', defaultValue: 0.8, min: 0.1, max: 1, step: 0.1 },
      { key: 'particleSize', label: 'Particle Size', type: 'number', defaultValue: 2, min: 1, max: 10, step: 1 },
      { key: 'enableMouse', label: 'Enable Mouse', type: 'boolean', defaultValue: true },
      { key: 'enablePulse', label: 'Enable Pulse', type: 'boolean', defaultValue: true },
      { key: 'depthEffect', label: 'Depth Effect', type: 'boolean', defaultValue: true }
    ],
    'liquid-ether': [
      { key: 'mouseForce', label: 'Mouse Force', type: 'number', defaultValue: 20, min: 1, max: 100, step: 1 },
      { key: 'cursorSize', label: 'Cursor Size', type: 'number', defaultValue: 100, min: 10, max: 500, step: 10 },
      { key: 'isViscous', label: 'Is Viscous', type: 'boolean', defaultValue: false },
      { key: 'viscous', label: 'Viscous', type: 'number', defaultValue: 30, min: 0, max: 100, step: 5 },
      { key: 'iterationsViscous', label: 'Iterations Viscous', type: 'number', defaultValue: 32, min: 1, max: 64, step: 1 },
      { key: 'iterationsPoisson', label: 'Iterations Poisson', type: 'number', defaultValue: 32, min: 1, max: 64, step: 1 },
      { key: 'dt', label: 'DT', type: 'number', defaultValue: 0.014, min: 0.001, max: 0.1, step: 0.001 },
      { key: 'BFECC', label: 'BFECC', type: 'boolean', defaultValue: true },
      { key: 'resolution', label: 'Resolution', type: 'number', defaultValue: 0.5, min: 0.1, max: 1, step: 0.1 },
      { key: 'isBounce', label: 'Is Bounce', type: 'boolean', defaultValue: false },
      { key: 'colors', label: 'Colors (comma-separated hex)', type: 'text', defaultValue: '#5227FF,#FF9FFC,#B19EEF' },
      { key: 'autoDemo', label: 'Auto Demo', type: 'boolean', defaultValue: true },
      { key: 'autoSpeed', label: 'Auto Speed', type: 'number', defaultValue: 0.5, min: 0.1, max: 2, step: 0.1 },
      { key: 'autoIntensity', label: 'Auto Intensity', type: 'number', defaultValue: 2.2, min: 0.5, max: 5, step: 0.1 }
    ]
  };

  constructor() {
    // Initialize form for initial state
    this.initializeForm(this.selectedEffect());

    effect(() => {
      const selected = this.selectedEffect();
      this.initializeForm(selected);
    }, { injector: this.injector });
  }

  initializeForm(effect: EffectType): void {
    const configs = this.componentConfigs[effect] || [];
    const formControls: Record<string, FormControl> = {};

    configs.forEach(config => {
      const control = new FormControl(config.defaultValue);
      formControls[config.key] = control;

      // Subscribe to form control changes and update signals for ASCII text
      if (effect === 'ascii-text') {
        control.valueChanges.subscribe(value => {
          if (config.key === 'containerHeight') {
            this.asciiContainerHeight.set(Number(value) || 400);
          } else if (config.key === 'textFontSize') {
            this.asciiTextFontSize.set(Number(value) || 200);
          } else if (config.key === 'asciiFontSize') {
            this.asciiFontSize.set(Number(value) || 2);
          } else if (config.key === 'textColor') {
            this.asciiTextColor.set(String(value) || '#fdf9f3');
          } else if (config.key === 'enableWaves') {
            this.asciiEnableWaves.set(Boolean(value));
          } else if (config.key === 'gradientType' || config.key.startsWith('customGradient')) {
            // Update gradient signal when gradient-related controls change
            this.asciiGradient.set(this.getGradientForAscii());
          }
        });
      }
    });

    // Always create a FormGroup, even if empty
    if (Object.keys(formControls).length > 0) {
      this.controlsForm = new FormGroup(formControls);
    } else {
      this.controlsForm = new FormGroup({});
    }

    // Initialize signals for ASCII text
    if (effect === 'ascii-text') {
      const containerHeight = this.controlsForm.get('containerHeight')?.value ?? 400;
      const textFontSize = this.controlsForm.get('textFontSize')?.value ?? 200;
      const asciiFontSize = this.controlsForm.get('asciiFontSize')?.value ?? 2;
      const textColor = this.controlsForm.get('textColor')?.value ?? '#fdf9f3';
      const enableWaves = this.controlsForm.get('enableWaves')?.value ?? true;

      this.asciiContainerHeight.set(Number(containerHeight));
      this.asciiTextFontSize.set(Number(textFontSize));
      this.asciiFontSize.set(Number(asciiFontSize));
      this.asciiTextColor.set(String(textColor));
      this.asciiEnableWaves.set(Boolean(enableWaves));
      this.asciiGradient.set(this.getGradientForAscii());
    }
  }

  getFormControls(): FormControlConfig[] {
    return this.componentConfigs[this.selectedEffect()] || [];
  }

  getFormValue(key: string): string | number | boolean {
    if (!this.controlsForm) {
      const config = this.componentConfigs[this.selectedEffect()]?.find(c => c.key === key);
      return config?.defaultValue ?? '';
    }
    const control = this.controlsForm.get(key);
    if (!control) {
      const config = this.componentConfigs[this.selectedEffect()]?.find(c => c.key === key);
      return config?.defaultValue ?? '';
    }
    return control.value ?? '';
  }

  getFormValueNumber(key: string): number {
    const value = this.getFormValue(key);
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    const config = this.componentConfigs[this.selectedEffect()]?.find(c => c.key === key);
    if (config && typeof config.defaultValue === 'number') {
      return config.defaultValue;
    }
    return 0;
  }

  getFormValueString(key: string): string {
    const value = this.getFormValue(key);
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  }

  getFormValueBoolean(key: string): boolean {
    const value = this.getFormValue(key);
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return Boolean(value);
  }

  getFormValueAnimateBy(): 'words' | 'letters' {
    const value = this.getFormValueString('animateBy');
    return (value === 'words' || value === 'letters') ? value : 'words';
  }

  getFormValueDirection(): 'top' | 'bottom' {
    const value = this.getFormValueString('direction');
    return (value === 'top' || value === 'bottom') ? value : 'top';
  }

  getFormValueAnimatedDirection(): 'vertical' | 'horizontal' {
    const value = this.getFormValueString('direction');
    return (value === 'vertical' || value === 'horizontal') ? value : 'vertical';
  }

  getFormValueBlobType(): 'circle' | 'square' {
    const value = this.getFormValueString('blobType');
    return (value === 'circle' || value === 'square') ? value : 'circle';
  }

  getFormValueOnHover(): 'speedUp' | 'slowDown' | 'pause' | 'goBonkers' | null {
    const value = this.getFormValueString('onHover');
    return (value === 'speedUp' || value === 'slowDown' || value === 'pause' || value === 'goBonkers') ? value : 'speedUp';
  }

  getFormValueTrigger(): 'auto' | 'hover' | 'click' {
    const value = this.getFormValueString('trigger');
    return (value === 'auto' || value === 'hover' || value === 'click') ? value : 'auto';
  }

  getFormValueShuffleDirection(): 'left' | 'right' {
    const value = this.getFormValueString('shuffleDirection');
    return (value === 'left' || value === 'right') ? value : 'right';
  }

  getFormValueRevealDirection(): 'start' | 'end' | 'center' {
    const value = this.getFormValueString('revealDirection');
    return (value === 'start' || value === 'end' || value === 'center') ? value : 'start';
  }

  getFormValueColorArray(key: string): [number, number, number] {
    const value = this.getFormValueString(key);
    const parts = value.split(',').map(v => parseFloat(v.trim()));
    if (parts.length === 3 && parts.every(v => !isNaN(v))) {
      return [parts[0], parts[1], parts[2]] as [number, number, number];
    }
    return [1, 1, 1];
  }

  getFormValueScanDirection(): 'forward' | 'backward' | 'pingpong' {
    const value = this.getFormValueString('scanDirection');
    return (value === 'forward' || value === 'backward' || value === 'pingpong') ? value : 'pingpong';
  }

  getFormValueLineStyle(): 'solid' | 'dashed' | 'dotted' {
    const value = this.getFormValueString('lineStyle');
    return (value === 'solid' || value === 'dashed' || value === 'dotted') ? value : 'solid';
  }

  getFormValueShineDirection(): 'left' | 'right' {
    const value = this.getFormValueString('shineDirection');
    return (value === 'left' || value === 'right') ? value : 'left';
  }

  getFormValuePrismAnimationType(): 'rotate' | 'hover' | '3drotate' {
    const value = this.getFormValueString('animationType');
    return (value === 'rotate' || value === 'hover' || value === '3drotate') ? value : 'rotate';
  }

  getFormValuePrismaticBurstAnimationType(): 'rotate' | 'rotate3d' | 'hover' {
    const value = this.getFormValueString('animationType');
    return (value === 'rotate' || value === 'rotate3d' || value === 'hover') ? value : 'rotate3d';
  }

  getFormValuePixelBlastVariant(): 'square' | 'circle' | 'triangle' | 'diamond' {
    const value = this.getFormValueString('variant');
    return (value === 'square' || value === 'circle' || value === 'triangle' || value === 'diamond') ? value : 'square';
  }

  getFormValuePosition(): 'top' | 'bottom' | 'left' | 'right' {
    const value = this.getFormValueString('position');
    return (value === 'top' || value === 'bottom' || value === 'left' || value === 'right') ? value : 'bottom';
  }

  getFormValueFalloff(): 'linear' | 'exponential' | 'gaussian' {
    const value = this.getFormValueString('falloff');
    return (value === 'linear' || value === 'exponential' || value === 'gaussian') ? value : 'linear';
  }

  getFormValueSplitType(): 'chars' | 'words' | 'lines' | 'chars,words' | 'chars,lines' | 'words,lines' | 'chars,words,lines' {
    const value = this.getFormValueString('splitType');
    const validValues: Array<'chars' | 'words' | 'lines' | 'chars,words' | 'chars,lines' | 'words,lines' | 'chars,words,lines'> = ['chars', 'words', 'lines', 'chars,words', 'chars,lines', 'words,lines', 'chars,words,lines'];
    return validValues.includes(value as any) ? value as any : 'chars';
  }

  getFormValueTag(): 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div' {
    const value = this.getFormValueString('tag');
    const validValues: Array<'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div'> = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'];
    return validValues.includes(value as any) ? value as any : 'h1';
  }

  getFormValueSquaresDirection(): 'right' | 'left' | 'up' | 'down' | 'diagonal' {
    const value = this.getFormValueString('direction');
    const validValues: Array<'right' | 'left' | 'up' | 'down' | 'diagonal'> = ['right', 'left', 'up', 'down', 'diagonal'];
    return validValues.includes(value as any) ? value as any : 'right';
  }

  getColorBendsColors(): string[] {
    const color = this.getFormValueString('color');
    return color ? [color] : [];
  }

  getGradientTextColors(): string[] {
    const color1 = this.getFormValueString('color1');
    const color2 = this.getFormValueString('color2');
    return [color1 || '#40ffaa', color2 || '#4079ff', color1 || '#40ffaa', color2 || '#4079ff', color1 || '#40ffaa'];
  }

  getFormValueLightRaysOrigin(): 'top-center' | 'top-left' | 'top-right' | 'right' | 'left' | 'bottom-center' | 'bottom-right' | 'bottom-left' {
    const value = this.getFormValueString('raysOrigin');
    const validValues: Array<'top-center' | 'top-left' | 'top-right' | 'right' | 'left' | 'bottom-center' | 'bottom-right' | 'bottom-left'> = ['top-center', 'top-left', 'top-right', 'right', 'left', 'bottom-center', 'bottom-right', 'bottom-left'];
    return validValues.includes(value as any) ? value as any : 'top-center';
  }

  getFormValuePlasmaDirection(): 'forward' | 'reverse' | 'pingpong' {
    const value = this.getFormValueString('direction');
    const validValues: Array<'forward' | 'reverse' | 'pingpong'> = ['forward', 'reverse', 'pingpong'];
    return validValues.includes(value as any) ? value as any : 'forward';
  }

  getFormValueLogoLoopDirection(): 'left' | 'right' | 'up' | 'down' {
    const value = this.getFormValueString('direction');
    const validValues: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'];
    return validValues.includes(value as any) ? value as any : 'left';
  }

  getParticleColors(): string[] {
    const color = this.getFormValueString('color');
    return color ? [color] : ['#ffffff'];
  }

  getDitherWaveColor(): [number, number, number] {
    const r = this.getFormValueNumber('waveColorR');
    const g = this.getFormValueNumber('waveColorG');
    const b = this.getFormValueNumber('waveColorB');
    return [r, g, b];
  }

  getGradientForAscii(): string | { type: 'linear' | 'radial'; colors: string[]; stops?: number[] } | undefined {
    const gradientType = this.getFormValueString('gradientType');

    if (gradientType === 'none') {
      return undefined;
    }

    if (gradientType === 'custom') {
      return {
        type: 'radial',
        colors: [
          this.getFormValueString('customGradientColor1'),
          this.getFormValueString('customGradientColor2'),
          this.getFormValueString('customGradientColor3')
        ]
      };
    }

    // Predefined gradients
    const gradients: Record<string, { type: 'linear' | 'radial'; colors: string[] }> = {
      'sunset': { type: 'linear', colors: ['#ff6188', '#fc9867', '#ffd866'] },
      'ocean': { type: 'linear', colors: ['#00c9ff', '#92fe9d'] },
      'forest': { type: 'linear', colors: ['#134e5e', '#71b280'] },
      'purple': { type: 'linear', colors: ['#667eea', '#764ba2'] },
      'fire': { type: 'linear', colors: ['#f12711', '#f5af19'] },
      'ice': { type: 'linear', colors: ['#89f7fe', '#66a6ff'] },
      'rainbow': { type: 'linear', colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'] }
    };

    return gradients[gradientType] || undefined;
  }

  getAuroraColorStops(): string[] {
    const value = this.getFormValueString('colorStops');
    if (!value) {
      return ['#5227FF', '#7cff67', '#5227FF'];
    }
    // Split by comma and trim each color
    const colors = value.split(',').map(c => c.trim()).filter(c => c.length > 0);
    // Ensure we have at least 3 colors
    if (colors.length < 3) {
      return ['#5227FF', '#7cff67', '#5227FF'];
    }
    return colors.slice(0, 3);
  }

  selectEffect(effect: EffectType): void {
    this.selectedEffect.set(effect);
    // Form will be initialized by the effect
    this.initializeForm(effect);
  }

  isSelected(effect: EffectType): boolean {
    return this.selectedEffect() === effect;
  }

  toggleCategory(category: string): void {
    const current = this.expandedCategories();
    const updated = new Set(current);
    if (updated.has(category)) {
      updated.delete(category);
    } else {
      updated.add(category);
    }
    this.expandedCategories.set(updated);
  }

  isCategoryExpanded(category: string): boolean {
    return this.expandedCategories().has(category);
  }

  getEffectsByCategory(category: string): Array<{ id: EffectType; name: string; category: string }> {
    return this.effects.filter(effect => effect.category === category);
  }

  getCategories(): string[] {
    return Array.from(new Set(this.effects.map(e => e.category)));
  }
}
