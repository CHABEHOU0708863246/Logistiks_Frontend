import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersRoles } from './users-roles';

describe('UsersRoles', () => {
  let component: UsersRoles;
  let fixture: ComponentFixture<UsersRoles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersRoles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersRoles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
