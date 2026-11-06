import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a default title', () => {
    expect(component.titulo()).toBe('Sistema Gestión');
  });

  it('should allow a custom title', () => {
    component.titulo.set('Gestión de Check-In');
    expect(component.titulo()).toBe('Gestión de Check-In');
  });
});
