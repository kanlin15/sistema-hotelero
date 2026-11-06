import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Habitaciones } from './pages/habitaciones/habitaciones';
import { Reservas } from './pages/reservas/reservas';
import { Panel } from './pages/panel/panel';
// Importa tu componente de check-in (ajusta la ruta según donde tengas tu carpeta, por ejemplo './pages/check/check')
import { CheckComponent } from './pages/check/check'; 

// Este archivo define las rutas principales del sistema hotelero.
// Cada path representa una pantalla del proyecto: login, habitaciones, reservas, panel y check-in.
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'habitaciones', component: Habitaciones },
  { path: 'reservas', component: Reservas },
  { path: 'panel', component: Panel },
  { path: 'check', component: CheckComponent } // Ruta para la vista de tarjetas de Check-In / Check-Out
];