import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { UserAdminService, UserResponse } from './user-admin.service';
import { PageResponse } from './leave-request.service';

describe('UserAdminService', () => {
  let service: UserAdminService;
  let httpMock: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };

  const mockUser: UserResponse = {
    id: 'user-1',
    email: 'test@example.com',
    accountStatus: 'ACTIVE',
    employeeId: 'emp-1',
  };

  beforeEach(() => {
    httpMock = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    };

    const injector = Injector.create({
      providers: [{ provide: HttpClient, useValue: httpMock }],
    });

    service = runInInjectionContext(injector, () => new UserAdminService());
  });

  it('should list users with pagination meta', () => {
    const pageResponse: PageResponse<UserResponse> = {
      data: [mockUser],
      pagination: { nextCursor: null, hasMore: false, limit: 1 },
    };
    httpMock.get.mockReturnValue(of(pageResponse));

    let result: PageResponse<UserResponse> | undefined;
    service.listUsers().subscribe((res) => (result = res));

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:8080/api/admin/users');
    expect(result).toEqual(pageResponse);
  });

  it('should get user by id', () => {
    httpMock.get.mockReturnValue(of(mockUser));

    let result: UserResponse | undefined;
    service.getUserById('user-1').subscribe((res) => (result = res));

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:8080/api/admin/users/user-1');
    expect(result).toEqual(mockUser);
  });

  it('should create a user', () => {
    httpMock.post.mockReturnValue(of(mockUser));

    let result: UserResponse | undefined;
    service
      .createUser({ email: 'test@example.com', employeeId: 'emp-1' })
      .subscribe((res) => (result = res));

    expect(httpMock.post).toHaveBeenCalledWith('http://localhost:8080/api/admin/users', {
      email: 'test@example.com',
      employeeId: 'emp-1',
    });
    expect(result).toEqual(mockUser);
  });

  it('should update user status and unlink/link employee', () => {
    httpMock.patch.mockReturnValue(of({ ...mockUser, accountStatus: 'SUSPENDED', employeeId: undefined }));

    let result: UserResponse | undefined;
    service
      .updateUser('user-1', { accountStatus: 'SUSPENDED', employeeId: '' })
      .subscribe((res) => (result = res));

    expect(httpMock.patch).toHaveBeenCalledWith('http://localhost:8080/api/admin/users/user-1', {
      accountStatus: 'SUSPENDED',
      employeeId: '',
    });
    expect(result?.accountStatus).toBe('SUSPENDED');
  });
});
