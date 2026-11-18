import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Habitaciones } from './pages/habitaciones/habitaciones';
import { Reservas } from './pages/reservas/reservas';
import { Panel } from './pages/panel/panel';
import { CheckComponent } from './pages/check/check';
import { RegistroUsuario } from './pages/registro-usuario/registro-usuario';
import { Catalogo } from './pages/catalogo/catalogo';

// Este archivo define las rutas principales del sistema hotelero.
// Cada path representa una pantalla del proyecto: login, habitaciones, reservas, panel y check-in.
export const routes: Routes = [
  { path: '', redirectTo: 'catalogo', pathMatch: 'full' },
  { path: 'catalogo', component: Catalogo },
  { path: 'login', component: Login },
  { path: 'registro-usuario', component: RegistroUsuario },
  { path: 'habitaciones', component: Habitaciones },
  { path: 'reservas', component: Reservas },
  { path: 'panel', component: Panel },
  { path: 'check', component: CheckComponent },
];