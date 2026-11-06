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

  // Obtenemos la señal de reservas del servicio
  reservas = this.reservasService.reservas;

  get reservasPendientes() {
    return this.reservas().filter(r => 
      r.estado === 'Pendiente' && this.cumpleFiltro(r)
    );
  }

  get huespedesActivos() {
    return this.reservas().filter(r => 
      r.estado === 'Confirmada' && this.cumpleFiltro(r)
    );
  }

  cumpleFiltro(reserva: Reserva): boolean {
    if (!this.busqueda.trim()) return true;
    const term = this.busqueda.toLowerCase();
    return (
      reserva.nombre.toLowerCase().includes(term) ||
      (reserva.numeroHabitacion && reserva.numeroHabitacion.toLowerCase().includes(term)) ||
      reserva.documento.toLowerCase().includes(term)
    );
  }

  realizarCheckIn(reserva: Reserva): void {
    if (reserva.id) {
      // Cambia el estado a Confirmada (lo que activa la habitación en el sistema)
      this.reservasService.cambiarEstado(reserva.id, 'Confirmada');
    }
  }

  realizarCheckOut(reserva: Reserva): void {
    if (reserva.id) {
      // Cambia el estado a Cancelada o Finalizada para liberar la habitación
      this.reservasService.cambiarEstado(reserva.id, 'Cancelada');
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