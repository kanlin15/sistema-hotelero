import { Injectable, computed, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Habitacion } from '../models/habitacion.model';

// Funciones necesarias para trabajar con Cloud Firestore.
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

// Aplicación Firebase inicializada en el proyecto.
import { firebaseApp } from '../firebase.init';

// providedIn: 'root' = una sola copia compartida por todas las pantallas
// (Habitaciones, Reservas y Panel leen la MISMA lista)
@Injectable({ providedIn: 'root' })
export class HabitacionesService {
  private plataforma = inject(PLATFORM_ID);

  // Lista de habitaciones consultadas desde Firebase.
  private _habitaciones = signal<Habitacion[]>([]);

  // Versión de solo lectura para las pantallas
  habitaciones = this._habitaciones.asReadonly();

  total = computed(() => this._habitaciones().length);
  disponibles = computed(() => this._habitaciones().filter((h) => h.estado === 'Disponible').length);
  ocupadas = computed(() => this._habitaciones().filter((h) => h.estado === 'Ocupada').length);

  // Espera a que Firebase entregue la primera consulta de habitaciones.
  private resolverCarga!: () => void;
  private cargaInicial = new Promise<void>((resolve) => {
    this.resolverCarga = resolve;
  });

  // Guarda la función que permite detener la escucha anterior.
  private detenerEscucha: (() => void) | null = null;

  constructor() {
    // Evita ejecutar Firebase durante el renderizado del servidor (SSR).
    if (isPlatformBrowser(this.plataforma)) {
      const db = getFirestore(firebaseApp);

      // Escucha los cambios de la colección en tiempo real.
      this.detenerEscucha = onSnapshot(
        collection(db, 'habitaciones'),
        (resultado) => {
          const lista = resultado.docs
            .map((documento) => documento.data() as Habitacion)
            .sort((a, b) => a.id - b.id);

          this._habitaciones.set(lista);
          this.resolverCarga();
        },
        (error) => {
          console.error('Error al consultar habitaciones en Firebase:', error);
          this.resolverCarga();
        },
      );
    }
  }

  // CREAR: agrega una habitación nueva en Firestore.
  async crear(datos: Omit<Habitacion, 'id'>): Promise<void> {
    await this.cargaInicial;

    const id = Math.max(0, ...this._habitaciones().map((h) => h.id)) + 1;

    const db = getFirestore(firebaseApp);

    // Utiliza el número consecutivo como identificador del documento.
    await setDoc(doc(db, 'habitaciones', String(id)), {
      ...datos,
      id,
    });
  }

  // ACTUALIZAR: reemplaza los datos de una habitación existente.
  // También la usa ReservasService para cambiar el estado (Reservada, Ocupada, etc.)
  async actualizar(habitacion: Habitacion): Promise<void> {
    await this.cargaInicial;

    const db = getFirestore(firebaseApp);

    // Busca el documento que contiene el identificador numérico.
    const resultado = await getDocs(
      query(
        collection(db, 'habitaciones'),
        where('id', '==', habitacion.id),
        limit(1),
      ),
    );

    if (resultado.empty) {
      throw new Error(`No se encontró la habitación con ID ${habitacion.id}.`);
    }

    await updateDoc(resultado.docs[0].ref, {
      ...habitacion,
    });
  }

  // ELIMINAR: borra una habitación de Firestore.
  async eliminar(id: number): Promise<void> {
    await this.cargaInicial;

    const db = getFirestore(firebaseApp);

    // Busca el documento utilizando el identificador numérico.
    const resultado = await getDocs(
      query(
        collection(db, 'habitaciones'),
        where('id', '==', id),
        limit(1),
      ),
    );

    if (resultado.empty) {
      throw new Error(`No se encontró la habitación con ID ${id}.`);
    }

    await deleteDoc(resultado.docs[0].ref);
  }
}
