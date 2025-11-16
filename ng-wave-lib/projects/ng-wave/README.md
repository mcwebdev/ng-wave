# NG Wave

A comprehensive Angular component library with **130+ animated, interactive, and customizable components**. Converted from React Bits with full feature parity, built with Angular Signals, GSAP animations, and Three.js for stunning visual effects.

## 🚀 Features

- **130+ Components**: Text animations, backgrounds, UI effects, and interactive elements
- **Fully Typed**: Complete TypeScript support
- **SSR Compatible**: Works with Angular Universal
- **Standalone Architecture**: Modern Angular standalone components
- **Signals-Based**: Reactive updates using Angular Signals
- **Zero Config**: Just install and use
- **Lightweight**: Tree-shakeable exports

## 📦 Installation

```bash
npm install ng-wave
```

## 🎯 Quick Start

```typescript
import { Component } from '@angular/core';
import { NeuralWebComponent, AuroraComponent, BlurTextComponent } from 'ng-wave';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NeuralWebComponent, AuroraComponent, BlurTextComponent],
  template: `
    <div class="container">
      <!-- Animated Background -->
      <ngw-neural-web
        [particleCount]="250"
        [connectionDistance]="250"
        [particleSpeed]="4"
      ></ngw-neural-web>

      <!-- Text Animation -->
      <ngw-blur-text text="Welcome to NG Wave"></ngw-blur-text>
    </div>
  `
})
export class AppComponent {}
```

## 📚 Component Categories

### 🎨 Backgrounds
- Aurora
- Neural Web
- Particles
- Plasma
- Galaxy
- Lightning
- Liquid Ether
- And 25+ more...

### ✨ Text Animations
- Blur Text
- Glitch Text
- Gradient Text
- Scrambled Text
- Decrypted Text
- And 25+ more...

### 🎭 Animations & Effects
- Electric Border
- Glare Hover
- Star Border
- Noise
- Cubes
- And 30+ more...

### 🧩 UI Components
- Animated Lists
- Carousels
- Menus
- Cards
- Galleries
- And 40+ more...

## 🎨 Example: Neural Web Background

```typescript
import { NeuralWebComponent } from 'ng-wave';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [NeuralWebComponent],
  template: `
    <div class="hero">
      <ngw-neural-web
        [particleCount]="300"
        [connectionDistance]="200"
        [particleSpeed]="4"
        [mouseRadius]="200"
        [mouseForce]="0.5"
        [pulseSpeed]="2"
        [lineOpacity]="0.8"
        [particleSize]="2"
        [enableMouse]="true"
        [enablePulse]="true"
        [depthEffect]="true"
        [colors]="['#00f5ff', '#ff00ff', '#00ff88']"
      ></ngw-neural-web>

      <div class="hero-content">
        <h1>Your Content Here</h1>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      position: relative;
      width: 100%;
      height: 100vh;
    }

    ngw-neural-web {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
  `]
})
export class HeroComponent {}
```

## 🔧 Requirements

- Angular 18+ (also supports Angular 19 and 20)
- TypeScript 5.0+

## 📖 Documentation

Full documentation and live examples coming soon!

## 🤝 Hire Me

**Looking for an Angular developer?**

I specialize in:
- Fullstack Web Development
- Angular component libraries
- Complex UI/UX implementations
- React to Angular migrations
- Performance optimization
- WebGL/Three.js integrations

### Connect with me:
- 💼 **LinkedIn**: [https://www.linkedin.com/in/mattcharlton/]
- 🌐 **Portfolio**: [angularux.com]
- 📧 **Email**: [mattcharlton33@gmail.com]
- 💼 **Hire Me**: [gitplumbers.com]

This library represents the conversion of 130+ React components to Angular with full feature parity. If you need similar work done, I'm available for hire!

## 📄 License

MIT © 

## 🙏 Credits

Original React components from [React Bits](https://github.com/react-bits). This is an independent Angular port with full feature parity and enhancements.

## ⭐ Show Your Support

If you find this library useful, please give it a star on GitHub and share it with others!

---


