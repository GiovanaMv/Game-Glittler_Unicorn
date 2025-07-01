import { Routes } from '@angular/router';
import { GameComponent } from '../components/Game/game.component';

export const routes: Routes = [
  { path: '', component: GameComponent },
  { path: 'game', component: GameComponent },
];

