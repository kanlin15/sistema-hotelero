import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitacionesService } from '../../services/habitaciones';
import { ReservasService } from '../../services/reservas';
import { Autenticacion } from '../../services/autenticacion';

// Dashboard principal del hotel.
// Muestra un resumen rápido del estado actual del sistema.
@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './panel.html',
  styleUrl: './panel.css',
})
export class Panel {
  private autenticacion = inject(Autenticacion);
  private habitacionesService = inject(HabitacionesService);
  private reservasService = inject(ReservasService);

  usuario = this.autenticacion.usuarioActual()?.nombre ?? 'Usuario';
  rol = this.autenticacion.usuarioActual()?.rol ?? 'administrador';

  fecha = this.fechaHoy();

  // Resumen reactivo del estado del hotel.
  resumen = computed(() => ({
    total: this.habitacionesService.total(),
    disponibles: this.habitacionesService.disponibles(),
    ocupadas: this.habitacionesService.ocupadas(),
    pendientes: this.reservasService.reservas().filter((r) => r.estado === 'Pendiente').length,
  }));

  // Arreglo de tarjetas visibles en el panel con su valor correspondiente.
  get tarjetas() {
    const r = this.resumen();
    return [
      { titulo: 'Total Habitaciones', valor: r.total, icono: '🛏️', clase: 'azul' },
      { titulo: 'Disponibles', valor: r.disponibles, icono: '✅', clase: 'verde' },
      { titulo: 'Ocupadas', valor: r.ocupadas, icono: '🚪', clase: 'naranja' },
      { titulo: 'Reservas Pendientes', valor: r.pendientes, icono: '📅', clase: 'morado' },
    ];
  }

  // Formatea la fecha actual en español para mostrarla en el dashboard.
  private fechaHoy() {
    const f = new Date().toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    return f.charAt(0).toUpperCase() + f.slice(1);
  }
}