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

  // ---------- SERVICIOS ----------
  // Servicio de reservas (datos y cálculos)
  private servicio = inject(ReservasService);
  // Servicio de habitaciones (para llenar el menú de habitaciones)
  private habitacionesServicio = inject(HabitacionesService);
  // Router, para cambiar de pantalla
  private router = inject(Router);

  // ---------- DATOS DE LA PANTALLA ----------
  busqueda = signal('');                          // texto del buscador
  modalNueva = signal(false);                     // true = se muestra "Nueva reserva"
  reservaDetalle = signal<Reserva | null>(null);  // reserva abierta en "Detalles" (null = cerrado)
  form = { ...VACIA };                            // datos del formulario (copia de VACIA)
  errorFechas = signal('');                       // mensaje si las fechas no son válidas

  // ---------- LISTAS CALCULADAS ----------
  // Solo se pueden reservar habitaciones "Disponible".
  // Se recalcula sola si una habitación cambia de estado.
  habitacionesLibres = computed(() =>
    this.habitacionesServicio.habitaciones().filter(h => h.estado === 'Disponible')
  );

  // Lista de la tabla, filtrada por nombre, habitación o documento.
  // Une esos tres datos en un solo texto y mira si contiene lo que escribiste.
  // Si el buscador está vacío, includes('') es verdadero y se muestran todas.
  filtradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();   // minúsculas y sin espacios sobrantes
    return this.servicio.reservas().filter(r =>
      `${r.nombre} ${r.numeroHabitacion} ${r.documento}`.toLowerCase().includes(q)
    );
  });

  // Total que se muestra en el formulario mientras eliges habitación y fechas.
  // Number(...) convierte el valor del menú a número. Devuelve 0 si falta algún dato.
  totalEstimado() {
    return this.servicio.calcularTotal(
      Number(this.form.habitacionId),
      this.form.fechaEntrada,
      this.form.fechaSalida
    );
  }

  // ---------- NAVEGACIÓN ----------
  // Botón "Volver": regresa al panel
  volver() {
    this.router.navigate(['/panel']);
  }

  // Botón "Cerrar sesión": por ahora lleva al login
  cerrarSesion() {
    this.router.navigate(['/login']);
  }

  // ---------- FORMULARIO "NUEVA RESERVA" ----------
  // Botón "+ Nueva Reserva": abre el formulario vacío
  nueva() {
    this.form = { ...VACIA };        // formulario limpio
    this.errorFechas.set('');        // borra errores anteriores
    this.modalNueva.set(true);       // muestra la ventana
  }

  // Botón "Crear Reserva"
  guardar() {
    // La salida debe ser posterior a la entrada.
    // Las fechas AAAA-MM-DD se pueden comparar directamente como texto.
    if (this.form.fechaSalida <= this.form.fechaEntrada) {
      this.errorFechas.set('La fecha de salida debe ser posterior a la de entrada.');
      return;                        // se detiene aquí y no guarda nada
    }
    // Crea la reserva (el servicio calcula el total y pone la habitación como "Reservada")
    this.servicio.crear({ ...this.form, habitacionId: Number(this.form.habitacionId) });
    this.cerrarNueva();
  }

  // Botón "Cancelar" o clic fuera del formulario
  cerrarNueva() {
    this.modalNueva.set(false);
  }

  // ---------- VENTANA "DETALLES" ----------
  // Botón "•••": abre el detalle de esa reserva
  verDetalle(r: Reserva) {
    this.reservaDetalle.set(r);      // guardar la reserva hace que aparezca la ventana
  }

  // Cierra el modal de detalles
  cerrarDetalle() {
    this.reservaDetalle.set(null);   // null = ventana cerrada
  }

  // ---------- ELIMINAR ----------
  // Botón "✕": pregunta antes de eliminar.
  // confirm() abre el cuadro "Aceptar / Cancelar" del navegador.
  eliminar(r: Reserva) {
    if (confirm(`¿Eliminar la reserva de ${r.nombre}?`)) {
      this.servicio.eliminar(r.id);  // el servicio borra la reserva y libera la habitación
    }
  }
}