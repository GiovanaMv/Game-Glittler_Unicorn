import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common'; // 👈 ADICIONE

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule], // 👈 ADICIONE
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'glitter-unicorn';
}
