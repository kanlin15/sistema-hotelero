import { Injectable, inject, signal } from '@angular/core';
import { Reserva } from '../models/reserva.model';
import { HabitacionesService } from './habitaciones';

export type NuevaReserva = Omit<Reserva, 'id' | 'total' | 'estado' | 'numeroHabitacion'>;

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private habitaciones = inject(HabitacionesService);

  private _reservas = signal<Reserva[]>(this.leer());

  reservas = this._reservas.asReadonly();

  calcularNoches(entrada: string, salida: string): number {
    const ms = new Date(salida).getTime() - new Date(entrada).getTime();
    const noches = Math.round(ms / (1000 * 60 * 60 * 24));
    return Math.max(noches, 1);
  }

  calcularTotal(habitacionId: number, entrada: string, salida: string): number {
    const hab = this.habitaciones.habitaciones().find(h => h.id === habitacionId);
    if (!hab || !entrada || !salida) return 0;
    return this.calcularNoches(entrada, salida) * hab.precio;
  }

  crear(datos: NuevaReserva) {
    const hab = this.habitaciones.habitaciones().find(h => h.id === datos.habitacionId);
    if (!hab) return;

    const id = Math.max(0, ...this._reservas().map(r => r.id)) + 1;

    const reserva: Reserva = {
      ...datos,
      id,
      numeroHabitacion: hab.numero,
      total: this.calcularTotal(datos.habitacionId, datos.fechaEntrada, datos.fechaSalida),
      estado: 'Pendiente',
    };

    this.guardar([...this._reservas(), reserva]);
    this.habitaciones.actualizar({ ...hab, estado: 'Reservada' });
  }

  cambiarEstado(id: number, estado: Reserva['estado']) {
    const reserva = this._reservas().find(r => r.id === id);
    if (!reserva) return;

    this.guardar(this._reservas().map(r => (r.id === id ? { ...r, estado } : r)));

    const hab = this.habitaciones.habitaciones().find(h => h.id === reserva.habitacionId);
    if (!hab) return;
    if (estado === 'Confirmada') this.habitaciones.actualizar({ ...hab, estado: 'Reservada' });
    if (estado === 'Cancelada') this.habitaciones.actualizar({ ...hab, estado: 'Disponible' });
  }

  eliminar(id: number) {
    const reserva = this._reservas().find(r => r.id === id);
    this.guardar(this._reservas().filter(r => r.id !== id));

    if (reserva && reserva.estado === 'Pendiente') {
      const hab = this.habitaciones.habitaciones().find(h => h.id === reserva.habitacionId);
      if (hab) this.habitaciones.actualizar({ ...hab, estado: 'Disponible' });
    }
  }

  private guardar(lista: Reserva[]) {
    this._reservas.set(lista);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reservas', JSON.stringify(lista));
    }
  }

  private leer(): Reserva[] {
    const inicial: Reserva[] = [
      {
        id: 1,
        nombre: 'Carlos Mendoza',
        documento: '1546897458484',
        email: 'carlos.mendoza@gmail.com',
        telefono: '3215148949894',
        habitacionId: 1,
        numeroHabitacion: '101',
        fechaEntrada: '2026-08-26',
        fechaSalida: '2026-09-01',
        total: 190000,
        estado: 'Pendiente',
      },
    ];

    if (typeof localStorage === 'undefined') return inicial;
    const guardadas = localStorage.getItem('reservas');
    if (guardadas) return JSON.parse(guardadas);

    localStorage.setItem('reservas', JSON.stringify(inicial));
    return inicial;
  }
}