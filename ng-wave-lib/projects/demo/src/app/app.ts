import { Component } from '@angular/core';
import { HeroShowcaseComponent } from '../../hero-showcase/hero-showcase';

@Component({
  selector: 'app-root',
  imports: [HeroShowcaseComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
