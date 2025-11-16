# NG Wave - Angular Component Library

A comprehensive Angular conversion of [React Bits](https://github.com/DavidHDev/react-bits), providing 110+ animated, interactive, and fully customizable Angular components for building memorable websites, more components added weekly.

## 🎯 Project Status

This is an ongoing conversion project. Currently implemented:

### ✅ Completed
- Project structure setup
- BlurText component (Text Animations category)
- GSAP animation integration
- SSR-safe implementation
- TypeScript interfaces and utilities

### 🚧 In Progress


## 📦 Installation

```bash
npm install ng-wave
```

## 🚀 Quick Start

### BlurText Component

```typescript
import { BlurTextComponent } from 'ng-wave';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [BlurTextComponent],
  template: `
    <ngw-blur-text
      text="Hello Angular World"
      [delay]="200"
      animateBy="words"
      direction="top"
      (animationComplete)="onComplete()"
    ></ngw-blur-text>
  `
})
export class ExampleComponent {
  onComplete() {
    console.log('Animation complete!');
  }
}
```

## 🎨 Component Categories

### Text Animations (23 components)
- ✅ BlurText
- ⏳ SplitText, CircularText, TextType, Shuffle, ShinyText, TextPressure, CurvedLoop, FuzzyText, GradientText, FallingText, TextCursor, DecryptedText, TrueFocus, ScrollFloat, ScrollReveal, ASCIIText, ScrambledText, RotatingText, GlitchText, ScrollVelocity, VariableProximity, CountUp

### Animations (26 components)
- ⏳ AnimatedContent, FadeContent, ElectricBorder, PixelTransition, GlareHover, LogoLoop, TargetCursor, LaserFlow, MagnetLines, GhostCursor, GradualBlur, ClickSpark, Magnet, StickerPeel, PixelTrail, Cubes, MetallicPaint, Noise, ShapeBlur, Crosshair, ImageTrail, Ribbons, SplashCursor, MetaBalls, BlobCursor, StarBorder

### Components (34 components)
- ⏳ AnimatedList, ScrollStack, BubbleMenu, MagicBento, CircularGallery, CardNav, Stack, FluidGlass, PillNav, TiltedCard, Masonry, GlassSurface, DomeGallery, ChromaGrid, Folder, StaggeredMenu, ModelViewer, Lanyard, ProfileCard, Dock, GooeyNav, PixelCard, Carousel, SpotlightCard, FlyingPosters, CardSwap, GlassIcons, DecayCard, FlowingMenu, ElasticSlider, Counter, InfiniteMenu, Stepper, BounceCards

### Backgrounds (33 components)
- ⏳ LiquidEther, Prism, DarkVeil, Silk, FloatingLines, LightRays, PixelBlast, ColorBends, Aurora, Plasma, Particles, GradientBlinds, GridScan, Beams, Lightning, PrismaticBurst, Galaxy, Dither, FaultyTerminal, RippleGrid, DotGrid, Threads, Hyperspeed, Iridescence, Waves, GridDistortion, Ballpit, Orb, LetterGlitch, GridMotion, Squares, LiquidChrome, Balatro

## 🛠️ Technical Stack

- **Angular 20+** - Latest Angular with Signals
- **GSAP** - Animation library
- **TypeScript** - Full type safety
- **Standalone Components** - Modern Angular architecture
- **SSR Compatible** - Server-side rendering support

## 📋 Features

- ✅ **SSR Safe** - All components check for browser environment
- ✅ **Signal-based** - Uses Angular Signals for reactivity
- ✅ **Fully Typed** - Complete TypeScript interfaces
- ✅ **Customizable** - Extensive prop/input options
- ✅ **Performance** - Optimized animations with GSAP
- ✅ **Modern Angular** - Uses latest Angular features (standalone, signals, new control flow)

## 🔧 Development

```bash
# Clone the repository
git clone <repository-url>
cd ng-wave-lib

# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test
```

## 📝 Conversion Notes

This library converts React Bits components to Angular following these principles:

1. **React Hooks → Angular Signals/Lifecycle**: `useState` → `signal()`, `useEffect` → lifecycle hooks
2. **JSX → Angular Templates**: React JSX converted to Angular template syntax with new control flow (`@if`, `@for`)
3. **Motion/React → GSAP**: Framer Motion animations converted to GSAP
4. **Props → Inputs/Outputs**: React props converted to Angular `@Input()` and `@Output()`
5. **SSR Safety**: All browser APIs wrapped with `isPlatformBrowser()` checks

## 🤝 Contributing

Contributions are welcome! This is a large conversion project and help is appreciated.

## 📄 License

MIT License (same as React Bits)

## 🙏 Credits

Original React library: [React Bits by DavidHDev](https://github.com/DavidHDev/react-bits)
