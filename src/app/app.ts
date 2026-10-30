import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar/navbar';

// Componente raíz de la aplicación.
// Se encarga de cargar el router principal y decidir si se muestra la barra global.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Router para saber en qué URL está el usuario en cada momento.
  private router = inject(Router);

  // Pantallas que ya traen su propia barra superior.
  // Cuando la URL coincide, el navbar global se oculta.
  private rutasSinNavbar = ['/habitaciones', '/reservas', '/checkin'];

  // Devuelve true cuando la pantalla actual es el login.
  get esLogin() {
    return this.router.url === '/' || this.router.url.startsWith('/login');
  }

  // Devuelve true si la vista actual ya tiene una barra propia.
  get tieneBarraPropia() {
    return this.rutasSinNavbar.some(r => this.router.url.startsWith(r));
  }
}