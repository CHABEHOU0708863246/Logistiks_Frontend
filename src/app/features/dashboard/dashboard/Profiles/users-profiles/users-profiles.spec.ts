import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersProfiles } from './users-profiles';

describe('UsersProfiles', () => {
  let component: UsersProfiles;
  let fixture: ComponentFixture<UsersProfiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersProfiles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersProfiles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
