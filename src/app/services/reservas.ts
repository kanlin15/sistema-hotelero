
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
export type NuevaReserva = Omit<Reserva, 'id' | 'total' | 'estado' | 'numeroHabitacion'>;

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
    // Evitamos ejecutar las consultas de Firebase durante SSR.
    if (isPlatformBrowser(this.plataforma)) {
      const auth = getAuth(firebaseApp);

      // Esperamos a que Firebase identifique al usuario conectado.
      onAuthStateChanged(auth, (usuario) => {
        this.detenerEscucha?.();
        this.detenerEscucha = null;

        if (!usuario) {
          this._reservas.set([]);
          this.resolverCarga();
          return;
        }

        const db = getFirestore(firebaseApp);

        // Escuchamos los cambios de la colección en tiempo real.
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
            console.error('Error al consultar reservas en Firebase:', error);
            this.resolverCarga();
          },
        );
      });
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

    const db = getFirestore(firebaseApp);

    // Consultamos los documentos existentes para generar el siguiente ID.
    const resultado = await getDocs(collection(db, 'reservas'));

    const ids = resultado.docs
      .map(documento => Number(documento.data()['id'] ?? 0))
      .filter(id => Number.isFinite(id));

    const id = Math.max(0, ...ids) + 1;

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
    };

    // Guardamos la reserva usando su ID como identificador del documento.
    await setDoc(doc(db, 'reservas', String(id)), reserva);

    // La habitación queda reservada mientras se procesa la reserva.
    await this.habitaciones.actualizar({
      ...hab,
      estado: 'Reservada',
    });
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
}
