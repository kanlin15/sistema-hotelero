import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Autenticacion } from '../../services/autenticacion';

// Barra de navegación principal del sistema.
// Se reutiliza en las pantallas donde se necesita acceso rápido a acciones del usuario.
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private router = inject(Router);
  autenticacion = inject(Autenticacion);
  titulo = input<string>('Sistema Gestión');

  // Cierra la sesión activa y redirige al formulario de login.
  salir() {
    this.autenticacion.cerrarSesion();
    this.router.navigate(['/login']);
  }
}