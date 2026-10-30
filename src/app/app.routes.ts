import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Habitaciones } from './pages/habitaciones/habitaciones';
import { Reservas } from './pages/reservas/reservas';
import { Panel } from './pages/panel/panel';

// Este archivo define las rutas principales del sistema hotelero.
// Cada path representa una pantalla del proyecto: login, habitaciones, reservas y panel.
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'habitaciones', component: Habitaciones },
  { path: 'reservas', component: Reservas },
  { path: 'panel', component: Panel },
];