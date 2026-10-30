import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';             // necesario para [(ngModel)]
import { CurrencyPipe } from '@angular/common';           // convierte 190000 en $190.000
import { Router } from '@angular/router';                 // para navegar a otra pantalla

import { HabitacionesService } from '../../services/habitaciones';
import { ReservasService } from '../../services/reservas';
import { Autenticacion } from '../../services/autenticacion';
import { EstadoHabitacion, Habitacion } from '../../models/habitacion.model';

// Valores iniciales del formulario cuando creas una habitación nueva
const VACIA: Omit<Habitacion, 'id'> = {
  numero: '',
  tipo: 'Individual',
  estado: 'Disponible',
  precio: 0,
  capacidad: 1,
  descripcion: '',
};

@Component({
  selector: 'app-habitaciones',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './habitaciones.html',
  styleUrl: './habitaciones.css',
})
export class Habitaciones {
  private servicio = inject(HabitacionesService);   // lista compartida de habitaciones
  private reservas = inject(ReservasService);       // para saber si una habitación tiene reservas
  private autenticacion = inject(Autenticacion);    // para cerrar sesión de verdad
  private router = inject(Router);

  busqueda = signal('');                        // texto del buscador
  modalAbierto = signal(false);                 // true = se muestra el formulario
  editandoId = signal<number | null>(null);     // null = creando; número = editando esa habitación
  error = signal('');                           // mensaje rojo del formulario
  form: Omit<Habitacion, 'id'> = { ...VACIA };  // datos que se están escribiendo

  // Opciones de los menús desplegables
  tipos = ['Individual', 'Familiar', 'Pareja', 'Suite'];
  estados: EstadoHabitacion[] = ['Disponible', 'Ocupada', 'Limpieza', 'Mantenimiento', 'Reservada'];

  // Lista que se muestra en pantalla, filtrada por el buscador
  filtradas = computed(() => {
    const texto = this.busqueda().toLowerCase().trim();
    return this.servicio.habitaciones().filter((h) =>
      `${h.numero} ${h.tipo} ${h.estado} ${h.descripcion}`.toLowerCase().includes(texto),
    );
  });

  // Botón "Volver": regresa al panel
  volver() {
    this.router.navigate(['/panel']);
  }

  // Botón "Cerrar sesión": borra la sesión y lleva al login
  cerrarSesion() {
    this.autenticacion.cerrarSesion();
    this.router.navigate(['/login']);
  }

  // Botón "+ Nueva habitación": abre el formulario vacío
  nueva() {
    this.form = { ...VACIA };
    this.editandoId.set(null);
    this.error.set('');
    this.modalAbierto.set(true);
  }

  // Botón "Editar": abre el formulario con los datos de esa habitación
  editar(h: Habitacion) {
    this.form = {
      numero: h.numero,
      tipo: h.tipo,
      estado: h.estado,
      precio: h.precio,
      capacidad: h.capacidad,
      descripcion: h.descripcion,
    };
    this.editandoId.set(h.id);
    this.error.set('');
    this.modalAbierto.set(true);
  }

  // Botón "Crear" / "Guardar" del formulario
  guardar() {
    const id = this.editandoId();
    const numero = this.form.numero.trim();

    // No puede haber dos habitaciones con el mismo número
    // (se ignora la que se está editando)
    const repetida = this.servicio
      .habitaciones()
      .some((h) => h.numero === numero && h.id !== id);
    if (repetida) {
      this.error.set(`Ya existe la habitación ${numero}.`);
      return;
    }

    // Precio y capacidad deben ser positivos
    if (this.form.precio <= 0 || this.form.capacidad < 1) {
      this.error.set('El precio y la capacidad deben ser mayores a 0.');
      return;
    }

    const datos = { ...this.form, numero, descripcion: this.form.descripcion.trim() };

    if (id === null) {
      this.servicio.crear(datos);
    } else {
      this.servicio.actualizar({ id, ...datos });
    }

    this.cerrar();
  }

  // Botón "Eliminar": no deja borrar si hay reservas pendientes, confirmadas o activas
  eliminar(h: Habitacion) {
    const tieneReservas = this.reservas
      .reservas()
      .some(
        (r) =>
          r.habitacionId === h.id &&
          (r.estado === 'Pendiente' || r.estado === 'Confirmada' || r.estado === 'Activa'),
      );

    if (tieneReservas) {
      alert(`La habitación ${h.numero} tiene reservas activas. Cancélalas o elimínalas primero.`);
      return;
    }

    if (confirm(`¿Eliminar la habitación ${h.numero}?`)) {
      this.servicio.eliminar(h.id);
    }
  }

  // Botón "Cancelar" o "X": cierra y deja el formulario limpio
  cerrar() {
    this.modalAbierto.set(false);
    this.editandoId.set(null);
    this.error.set('');
    this.form = { ...VACIA };
  }
}
