// ============================================================
// PANTALLA: GESTIÓN DE RESERVAS (lógica)
// Este archivo es el "cerebro" de reservas.html: guarda los datos
// que se ven en pantalla y define lo que hace cada botón.
// ============================================================

// Herramientas de Angular:
// - Component: convierte la clase en una pantalla
// - computed: valor que se recalcula solo cuando cambian los datos de los que depende
// - inject: pide un servicio a Angular
// - signal: variable "reactiva", avisa a la pantalla cuando cambia
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';              // necesario para [(ngModel)] en el formulario
import { CurrencyPipe, DatePipe } from '@angular/common';  // formatos: $190.000 y 17/05/2026
import { Router } from '@angular/router';                  // para navegar a otra pantalla

// Servicios y modelo propios del proyecto
import { ReservasService } from '../../services/reservas';          // guarda y calcula las reservas
import { HabitacionesService } from '../../services/habitaciones';  // lista de habitaciones
import { Reserva } from '../../models/reserva.model';               // "forma" de una reserva
import { Autenticacion } from '../../services/autenticacion';

// Valores iniciales del formulario cuando creas una reserva nueva.
// Se copia con { ...VACIA } cada vez que se abre el formulario, para que quede limpio.
const VACIA = {
  nombre: '',
  documento: '',
  email: '',
  telefono: '',
  habitacionId: 0,       // 0 = todavía no eligió habitación
  fechaEntrada: '',
  fechaSalida: '',
};

@Component({
  selector: 'app-reservas',           // nombre de la etiqueta de esta pantalla
  standalone: true,                   // el componente se declara solo, sin módulos
  imports: [FormsModule, CurrencyPipe, DatePipe], // lo que el HTML necesita usar
  templateUrl: './reservas.html',     // archivo con lo que se ve
  styleUrl: './reservas.css',         // archivo con los estilos
})
export class Reservas {
  private servicio = inject(ReservasService);
  private habitacionesServicio = inject(HabitacionesService);
  private router = inject(Router);
  private autenticacion = inject(Autenticacion);

  busqueda = signal('');
  modalNueva = signal(false);
  reservaDetalle = signal<Reserva | null>(null);

  form = { ...VACIA };
  errorFechas = signal('');
  errorReserva = signal('');

  habitacionesLibres = computed(() =>
    this.habitacionesServicio.habitaciones().filter(h => h.estado === 'Disponible')
  );

  filtradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();

    return this.servicio.reservas().filter(r =>
      `${r.nombre} ${r.numeroHabitacion} ${r.documento}`.toLowerCase().includes(q)
    );
  });

  totalEstimado() {
    return this.servicio.calcularTotal(
      Number(this.form.habitacionId),
      this.form.fechaEntrada,
      this.form.fechaSalida
    );
  }

  volver() {
    this.router.navigate(['/panel']);
  }

  cerrarSesion() {
    this.autenticacion.cerrarSesion();
    this.router.navigate(['/login']);
  }

  nueva() {
    this.form = { ...VACIA };
    this.errorFechas.set('');
    this.modalNueva.set(true);
  }

  // Valida las fechas y guarda la reserva en Firebase.
  async guardar() {
    if (this.form.fechaSalida <= this.form.fechaEntrada) {
      this.errorFechas.set('La fecha de salida debe ser posterior a la de entrada.');
      return;
    }

    this.errorReserva.set(''); // Reinicia el error al intentar guardar una nueva reserva

    try {
      await this.servicio.crear({
        ...this.form,
        habitacionId: Number(this.form.habitacionId)
      });

      this.cerrarNueva();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al crear la reserva.';
      this.errorReserva.set(mensaje);
      console.error('Error al guardar la reserva:', error);
    }
  }

  cerrarNueva() {
    this.modalNueva.set(false);
  }

  verDetalle(r: Reserva) {
    this.reservaDetalle.set(r);
  }

  cerrarDetalle() {
    this.reservaDetalle.set(null);
  }

  // Confirma la eliminación y espera a que Firebase la complete.
  async eliminar(r: Reserva) {
    if (confirm(`¿Eliminar la reserva de ${r.nombre}?`)) {
      try {
        await this.servicio.eliminar(r.id);
      } catch (error) {
        console.error('Error al eliminar la reserva:', error);
      }
    }
  }

  async confirmarPago(r: Reserva) {
    const totalConfirmar = r.montoPagado ?? r.total;
    if (!confirm(`¿Confirmar el pago de ${r.nombre} por ${this.currency(totalConfirmar)}?`)) return;

    try {
      await this.servicio.confirmarPago(r.id);
      this.reservaDetalle.set(null);
    } catch (error) {
      console.error('Error al confirmar el pago:', error);
      alert('No se pudo confirmar el pago. Inténtalo nuevamente.');
    }
  }

  private currency(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(valor);
  }
}
