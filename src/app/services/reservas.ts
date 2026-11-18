import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Reserva } from '../models/reserva.model';
import { HabitacionesService } from './habitaciones';

// Herramientas necesarias para conectar las reservas con Firebase.
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  limit,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { firebaseApp } from '../firebase.init';

// Datos que se reciben al crear una reserva nueva.
export type NuevaReserva = Omit<Reserva, 'id' | 'total' | 'estado' | 'numeroHabitacion' | 'pagoEstado' | 'montoPagado' | 'puntosOtorgados'> & {
  pagoEstado?: Reserva['pagoEstado'];
  montoPagado?: number;
  puntosOtorgados?: number;
};

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private habitaciones = inject(HabitacionesService);
  private plataforma = inject(PLATFORM_ID);

  // Señal que contiene las reservas recibidas desde Firestore.
  private _reservas = signal<Reserva[]>([]);
  reservas = this._reservas.asReadonly();

  // Esperamos a que Firebase termine de cargar las reservas.
  private resolverCarga!: () => void;
  private cargaInicial = new Promise<void>((resolve) => {
    this.resolverCarga = resolve;
  });

  private detenerEscucha: (() => void) | null = null;

  constructor() {
    if (isPlatformBrowser(this.plataforma)) {
      const db = getFirestore(firebaseApp);

      this.detenerEscucha = onSnapshot(
        collection(db, 'reservas'),
        (resultado) => {
          const lista = resultado.docs
            .map((documento) => documento.data() as Reserva)
            .sort((a, b) => a.id - b.id);

          this._reservas.set(lista);
          this.resolverCarga();
        },
        (error) => {
          console.error('Error al consultar reservas:', error);
          this.resolverCarga();
        },
      );
    }
  }

  // Calcula la cantidad de noches entre la entrada y la salida.
  calcularNoches(entrada: string, salida: string): number {
    const ms = new Date(salida).getTime() - new Date(entrada).getTime();
    const noches = Math.round(ms / (1000 * 60 * 60 * 24));
    return Math.max(noches, 1);
  }

  // Calcula el precio total según la habitación y las noches.
  calcularTotal(habitacionId: number, entrada: string, salida: string): number {
    const hab = this.habitaciones.habitaciones().find(h => h.id === habitacionId);

    if (!hab || !entrada || !salida) return 0;

    return this.calcularNoches(entrada, salida) * hab.precio;
  }

  // Crea una reserva y la guarda en Firestore.
  async crear(datos: NuevaReserva): Promise<void> {
    await this.cargaInicial;

    const hab = this.habitaciones.habitaciones().find(
      h => h.id === datos.habitacionId
    );

    if (!hab) {
      throw new Error('No se encontró la habitación seleccionada.');
    }

    if (hab.estado !== 'Disponible') {
      throw new Error('La habitación ya no está disponible.');
    }

    if (this.hayConflicto(datos.habitacionId, datos.fechaEntrada, datos.fechaSalida)) {
      throw new Error('La habitación ya tiene una reserva en esas fechas.');
    }

    if (datos.fechaSalida <= datos.fechaEntrada) {
      throw new Error('La fecha de salida debe ser posterior a la entrada.');
    }

    const db = getFirestore(firebaseApp);

    // Consultamos los documentos existentes para generar el siguiente ID.
    const resultado = await getDocs(collection(db, 'reservas'));

    const ids = resultado.docs
      .map(documento => Number(documento.data()['id'] ?? 0))
      .filter(id => Number.isFinite(id));

    const id = Math.max(0, ...ids) + 1;

    const usuario = getAuth(firebaseApp).currentUser;

    const reserva: Reserva = {
      ...datos,
      id,
      numeroHabitacion: hab.numero,
      total: this.calcularTotal(
        datos.habitacionId,
        datos.fechaEntrada,
        datos.fechaSalida
      ),
      estado: 'Pendiente',
      usuarioUid: usuario?.uid,
      pagoEstado: datos.pagoEstado ?? 'Pendiente',
      montoPagado: datos.montoPagado ?? this.calcularTotal(
        datos.habitacionId,
        datos.fechaEntrada,
        datos.fechaSalida
      ),
      puntosOtorgados: datos.puntosOtorgados ?? 0,
    };

    // Guardamos la reserva usando su ID como identificador del documento.
    await setDoc(doc(db, 'reservas', String(id)), reserva);

    if (reserva.usuarioUid && (reserva.descuentoBienvenida ?? 0) > 0) {
      try {
        const cliente = await getDocs(
          query(collection(db, 'usuarios'), where('uid', '==', reserva.usuarioUid), limit(1)),
        );

        if (!cliente.empty) {
          await updateDoc(cliente.docs[0].ref, { bienvenidaUsada: true });
        }
      } catch (error) {
        console.warn('No se pudo marcar la bienvenida en Firestore:', error);
      }

      if (isPlatformBrowser(this.plataforma)) {
        const usuariosLocales = JSON.parse(localStorage.getItem('clientes') ?? '[]') as Array<Record<string, unknown>>;
        const actualizado = usuariosLocales.map((item) =>
          item['uid'] === reserva.usuarioUid
            ? { ...item, bienvenidaUsada: true }
            : item,
        );
        localStorage.setItem('clientes', JSON.stringify(actualizado));

        if (this.sesionActualLocal()?.['uid'] === reserva.usuarioUid) {
          const sesion = this.sesionActualLocal();
          if (sesion) {
            localStorage.setItem('sesion', JSON.stringify({ ...sesion, bienvenidaUsada: true }));
          }
        }
      }
    }
  }

  // Cambia el estado de una reserva y actualiza el estado de su habitación.
  async cambiarEstado(
    id: number,
    estado: Reserva['estado']
  ): Promise<void> {
    await this.cargaInicial;

    const reserva = this._reservas().find(r => r.id === id);
    if (!reserva) return;

    const db = getFirestore(firebaseApp);

    const resultado = await getDocs(
      query(
        collection(db, 'reservas'),
        where('id', '==', id),
        limit(1)
      )
    );

    if (resultado.empty) {
      throw new Error(`No se encontró la reserva con ID ${id}.`);
    }

    // Actualizamos el estado de la reserva en Firestore.
    await updateDoc(resultado.docs[0].ref, { estado });

    const hab = this.habitaciones.habitaciones().find(
      h => h.id === reserva.habitacionId
    );

    if (!hab) return;

    // Cada estado de la reserva tiene un estado correspondiente de habitación.
    const estadosHabitacion: Partial<Record<Reserva['estado'], typeof hab.estado>> = {
      Pendiente: 'Reservada',
      Confirmada: 'Reservada',
      Activa: 'Ocupada',
      Finalizada: 'Limpieza',
      Cancelada: 'Disponible',
    };

    const nuevoEstado = estadosHabitacion[estado];

    if (nuevoEstado) {
      await this.habitaciones.actualizar({
        ...hab,
        estado: nuevoEstado,
      });
    }
  }

  // Elimina una reserva de Firestore.
  async eliminar(id: number): Promise<void> {
    await this.cargaInicial;

    const reserva = this._reservas().find(r => r.id === id);

    const db = getFirestore(firebaseApp);

    const resultado = await getDocs(
      query(
        collection(db, 'reservas'),
        where('id', '==', id),
        limit(1)
      )
    );

    if (resultado.empty) {
      throw new Error(`No se encontró la reserva con ID ${id}.`);
    }

    await deleteDoc(resultado.docs[0].ref);

    // Si se elimina una reserva pendiente, liberamos su habitación.
    if (reserva && reserva.estado === 'Pendiente') {
      const hab = this.habitaciones.habitaciones().find(
        h => h.id === reserva.habitacionId
      );

      if (hab) {
        await this.habitaciones.actualizar({
          ...hab,
          estado: 'Disponible',
        });
      }
    }
  }

  // Comprueba si una habitación ya tiene una reserva activa en esas fechas.
  hayConflicto(habitacionId: number, entrada: string, salida: string): boolean {
    const entradaSolicitada = new Date(`${entrada}T00:00:00`).getTime();
    const salidaSolicitada = new Date(`${salida}T00:00:00`).getTime();

    return this._reservas().some((reserva) => {
      if (reserva.habitacionId !== habitacionId) return false;
      if (['Cancelada', 'Finalizada'].includes(reserva.estado)) return false;

      const entradaExistente = new Date(`${reserva.fechaEntrada}T00:00:00`).getTime();
      const salidaExistente = new Date(`${reserva.fechaSalida}T00:00:00`).getTime();

      return entradaSolicitada < salidaExistente && salidaSolicitada > entradaExistente;
    });
  }

  // Confirma el pago de una reserva y suma puntos al usuario registrado según el monto pagado.
  async confirmarPago(id: number): Promise<void> {
    await this.cargaInicial;

    const reserva = this._reservas().find((item) => item.id === id);
    if (!reserva) throw new Error('No se encontró la reserva.');

    const db = getFirestore(firebaseApp);
    const resultado = await getDocs(
      query(collection(db, 'reservas'), where('id', '==', id), limit(1)),
    );

    if (resultado.empty) throw new Error('No se encontró la reserva en Firebase.');

    const montoPagado = reserva.montoPagado ?? reserva.total;
    const puntosOtorgados = Math.floor(montoPagado / 1000);

    await updateDoc(resultado.docs[0].ref, {
      pagoEstado: 'Pagado',
      montoPagado,
      puntosOtorgados,
    });

    if (reserva.usuarioUid) {
      if (isPlatformBrowser(this.plataforma)) {
        const usuariosLocales = JSON.parse(localStorage.getItem('clientes') ?? '[]') as Array<Record<string, unknown>>;
        const actualizado = usuariosLocales.map((item) => {
          if (item['uid'] !== reserva.usuarioUid) return item;
          const puntosActuales = Number(item['puntos'] ?? 0);
          const puntosRestantes = Math.max(0, puntosActuales - (reserva.puntosUsados ?? 0));
          return { ...item, puntos: puntosRestantes + puntosOtorgados };
        });
        localStorage.setItem('clientes', JSON.stringify(actualizado));

        const sesion = this.sesionActualLocal();
        if (sesion?.['uid'] === reserva.usuarioUid) {
          const puntosActuales = Number(sesion['puntos'] ?? 0);
          const puntosRestantes = Math.max(0, puntosActuales - (reserva.puntosUsados ?? 0));
          localStorage.setItem('sesion', JSON.stringify({
            ...sesion,
            puntos: puntosRestantes + puntosOtorgados,
          }));
        }
      }

      try {
        const cliente = await getDocs(
          query(collection(db, 'usuarios'), where('uid', '==', reserva.usuarioUid), limit(1)),
        );

        if (!cliente.empty) {
          const datos = cliente.docs[0].data();
          const puntosActuales = Number(datos['puntos'] ?? 0);
          const puntosRestantes = Math.max(0, puntosActuales - (reserva.puntosUsados ?? 0));
          await updateDoc(cliente.docs[0].ref, {
            puntos: puntosRestantes + puntosOtorgados,
          });
        }
      } catch (error) {
        console.warn('No se pudieron actualizar los puntos en Firestore:', error);
      }
    }
  }

  private sesionActualLocal(): Record<string, unknown> | null {
    if (!isPlatformBrowser(this.plataforma)) return null;
    const sesion = localStorage.getItem('sesion');
    return sesion ? JSON.parse(sesion) as Record<string, unknown> : null;
  }
}
