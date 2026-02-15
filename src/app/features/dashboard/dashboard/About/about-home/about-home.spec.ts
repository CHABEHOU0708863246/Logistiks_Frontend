import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutHome } from './about-home';

describe('AboutHome', () => {
  let component: AboutHome;
  let fixture: ComponentFixture<AboutHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
