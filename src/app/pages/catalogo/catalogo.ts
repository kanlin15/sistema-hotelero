import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { HabitacionesService } from '../../services/habitaciones';
import { ReservasService } from '../../services/reservas';
import { Autenticacion } from '../../services/autenticacion';
import { Habitacion } from '../../models/habitacion.model';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo {
  private habitaciones = inject(HabitacionesService);
  private reservas = inject(ReservasService);
  private autenticacion = inject(Autenticacion);
  private router = inject(Router);

  habitacionesDisponibles = computed(() =>
    this.habitaciones.habitaciones().filter((h) => h.estado === 'Disponible'),
  );
  sesion = this.autenticacion.usuarioActual;
  habitacionSeleccionada = signal<Habitacion | null>(null);
  fechaEntrada = '';
  fechaSalida = '';
  fechaHoy = new Date().toISOString().slice(0, 10);
  nombre = this.sesion()?.nombre ?? '';
  documento = '';
  email = '';
  telefono = '';
  mensaje = '';
  error = '';
  guardando = false;
  metodoPago: 'Tarjeta' | 'Transferencia' | 'Efectivo' = 'Transferencia';
  usarPuntos = false;

  puntosDisponibles = computed(() => Number(this.sesion()?.puntos ?? 0));

  descuentoBienvenida = computed(() => {
    if (!this.sesion() || this.sesion()?.bienvenidaUsada === true) return 0;
    return Math.round(this.total() * 0.10);
  });

  descuentoPuntos = computed(() => {
    if (!this.sesion() || !this.usarPuntos) return 0;
    return Math.min(this.puntosDisponibles(), this.total() - this.descuentoBienvenida());
  });

  total = computed(() => {
    const habitacion = this.habitacionSeleccionada();
    if (!habitacion || !this.fechaEntrada || !this.fechaSalida) return 0;
    return this.reservas.calcularTotal(habitacion.id, this.fechaEntrada, this.fechaSalida);
  });

  totalFinal = computed(() =>
    Math.max(0, this.total() - this.descuentoBienvenida() - this.descuentoPuntos()),
  );

  abrirCotizacion(habitacion: Habitacion) {
    this.habitacionSeleccionada.set(habitacion);
    this.fechaEntrada = '';
    this.fechaSalida = '';
    this.mensaje = '';
    this.error = '';
  }

  cerrarCotizacion() {
    this.habitacionSeleccionada.set(null);
  }

  async reservar() {
    const habitacion = this.habitacionSeleccionada();
    if (!habitacion) return;

    if (!this.fechaEntrada || !this.fechaSalida || this.fechaSalida <= this.fechaEntrada) {
      this.error = 'Selecciona una fecha de entrada y una salida posterior.';
      return;
    }

    if (this.fechaEntrada < this.fechaHoy) {
      this.error = 'La fecha de entrada no puede estar en el pasado.';
      return;
    }

    if (this.reservas.hayConflicto(habitacion.id, this.fechaEntrada, this.fechaSalida)) {
      this.error = 'Esta habitación ya está reservada durante algunas de esas fechas.';
      return;
    }

    if (!this.sesion()) {
      this.mensaje = `Cotización lista: ${this.reservas.calcularNoches(this.fechaEntrada, this.fechaSalida)} noche(s) por ${this.formatearCOP(this.total())}.`; 
      this.error = '';
      return;
    }

    if (!this.nombre.trim() || !this.documento.trim() || !this.email.trim() || !this.telefono.trim()) {
      this.error = 'Completa nombre, documento, correo y teléfono.';
      return;
    }

    this.guardando = true;
    try {
      await this.reservas.crear({
        nombre: this.nombre.trim(),
        documento: this.documento.trim(),
        email: this.email.trim(),
        telefono: this.telefono.trim(),
        habitacionId: habitacion.id,
        fechaEntrada: this.fechaEntrada,
        fechaSalida: this.fechaSalida,
        metodoPago: this.metodoPago,
        pagoEstado: 'Pendiente',
        montoPagado: this.totalFinal(),
        descuentoBienvenida: this.descuentoBienvenida(),
        descuentoPuntos: this.descuentoPuntos(),
        puntosUsados: this.usarPuntos ? this.descuentoPuntos() : 0,
      } as never);
      this.mensaje = 'Reserva registrada. Los puntos se otorgarán al confirmar el pago.';
      this.error = '';
    } catch (error) {
      console.error('Error al crear reserva desde el catálogo:', error);
      this.error = 'No se pudo guardar la reserva. Inténtalo nuevamente.';
    }
    this.guardando = false;
  }

  irARegistro() {
    this.router.navigate(['/registro-usuario']);
  }

  irAIngreso() {
    this.router.navigate(['/login']);
  }

  private formatearCOP(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(valor);
  }
}