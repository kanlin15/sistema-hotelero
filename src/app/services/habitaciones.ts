import { Injectable, computed, signal } from '@angular/core';
import { Habitacion } from '../models/habitacion.model';

// providedIn: 'root' = una sola copia compartida por todas las pantallas
// (Habitaciones, Reservas y Panel leen la MISMA lista)
@Injectable({ providedIn: 'root' })
export class HabitacionesService {
  // Lista de habitaciones. Al iniciar lee lo que haya guardado en el navegador;
  // si no hay nada, empieza vacía.
  // "signal" avisa a las pantallas cuando cambia, para que se actualicen solas.
  private _habitaciones = signal<Habitacion[]>(this.leer());

  // Versión de solo lectura para las pantallas
  habitaciones = this._habitaciones.asReadonly();

  total = computed(() => this._habitaciones().length);
  disponibles = computed(() => this._habitaciones().filter((h) => h.estado === 'Disponible').length);
  ocupadas = computed(() => this._habitaciones().filter((h) => h.estado === 'Ocupada').length);

  // CREAR: agrega una habitación nueva (el id se calcula solo)
  crear(datos: Omit<Habitacion, 'id'>) {
    const id = Math.max(0, ...this._habitaciones().map((h) => h.id)) + 1; // el más alto + 1
    this.guardar([...this._habitaciones(), { ...datos, id }]);
  }

  // ACTUALIZAR: reemplaza los datos de una habitación existente.
  // También la usa ReservasService para cambiar el estado (Reservada, Ocupada, etc.)
  actualizar(habitacion: Habitacion) {
    this.guardar(this._habitaciones().map((h) => (h.id === habitacion.id ? habitacion : h)));
  }

  // ELIMINAR: borra una habitación
  eliminar(id: number) {
    this.guardar(this._habitaciones().filter((h) => h.id !== id));
  }

  // Actualiza la lista en pantalla y la guarda en el navegador (localStorage).
  // typeof localStorage... evita errores cuando Angular corre en el servidor (SSR).
  private guardar(lista: Habitacion[]) {
    this._habitaciones.set(lista);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('habitaciones', JSON.stringify(lista));
    }
  }

  // Lee las habitaciones guardadas. Si no hay ninguna, empieza con una base real para que la app funcione desde el primer arranque.
  private leer(): Habitacion[] {
    const inicial: Habitacion[] = [
      { id: 1, numero: '101', tipo: 'Individual', estado: 'Disponible', precio: 150000, capacidad: 2, descripcion: 'Habitación tranquila con vista al patio' },
      { id: 2, numero: '102', tipo: 'Doble', estado: 'Disponible', precio: 220000, capacidad: 4, descripcion: 'Habitación familiar con dos camas' },
      { id: 3, numero: '201', tipo: 'Suite', estado: 'Disponible', precio: 350000, capacidad: 3, descripcion: 'Suite moderna con balcón' },
      { id: 4, numero: '202', tipo: 'Individual', estado: 'Ocupada', precio: 170000, capacidad: 2, descripcion: 'Habitación ocupada por huésped actual' },
    ];

    if (typeof localStorage === 'undefined') return inicial;
    const guardadas = localStorage.getItem('habitaciones');
    if (guardadas) return JSON.parse(guardadas);

    localStorage.setItem('habitaciones', JSON.stringify(inicial));
    return inicial;
  }
}