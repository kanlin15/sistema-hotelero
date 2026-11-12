
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReservasService } from '../../services/reservas';
import { Reserva } from '../../models/reserva.model';
import { Autenticacion } from '../../services/autenticacion';

@Component({
  selector: 'app-check',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './check.html',
  styleUrls: ['./check.css']
})
export class CheckComponent {
  private reservasService = inject(ReservasService);
  private autenticacion = inject(Autenticacion);
  private router = inject(Router);

  busqueda: string = '';
  tituloVista: string = 'Gestión de Check-In';

  // Obtenemos la señal de reservas del servicio.
  reservas = this.reservasService.reservas;

  // Mostramos las reservas pendientes que coinciden con la búsqueda.
  get reservasPendientes() {
    return this.reservas().filter(r =>
      r.estado === 'Pendiente' && this.cumpleFiltro(r)
    );
  }

  // Mostramos los huéspedes que ya realizaron el Check-In.
  get huespedesActivos() {
    return this.reservas().filter(r =>
      r.estado === 'Activa' && this.cumpleFiltro(r)
    );
  }

  // Comprueba si una reserva coincide con el texto de búsqueda.
  cumpleFiltro(reserva: Reserva): boolean {
    if (!this.busqueda.trim()) return true;

    const term = this.busqueda.toLowerCase();

    return (
      reserva.nombre.toLowerCase().includes(term) ||
      (reserva.numeroHabitacion &&
        reserva.numeroHabitacion.toLowerCase().includes(term)) ||
      reserva.documento.toLowerCase().includes(term)
    );
  }

  // Realiza el Check-In y cambia la habitación a Ocupada.
  async realizarCheckIn(reserva: Reserva): Promise<void> {
    if (reserva.id) {
      try {
        await this.reservasService.cambiarEstado(reserva.id, 'Activa');
      } catch (error) {
        console.error('Error al realizar el Check-In:', error);
      }
    }
  }

  // Realiza el Check-Out y cambia la habitación a Limpieza.
  async realizarCheckOut(reserva: Reserva): Promise<void> {
    if (reserva.id) {
      try {
        await this.reservasService.cambiarEstado(reserva.id, 'Finalizada');
      } catch (error) {
        console.error('Error al realizar el Check-Out:', error);
      }
    }
  }

  volver(): void {
    window.history.back();
  }

  cerrarSesion(): void {
    this.autenticacion.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
