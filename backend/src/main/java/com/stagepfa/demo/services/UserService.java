package com.stagepfa.demo.services;


import com.stagepfa.demo.domain.dtos.request.CreateUserRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateUserRequest;
import com.stagepfa.demo.domain.entities.User;

import java.util.List;
import java.util.Optional;

public interface UserService {
    List<User> findAll();

    User findById(String id);

    Optional<User> findByEmail(String email);

    Optional<User> findBySubject(String subject);

    User create(CreateUserRequest request);

    User update(String id, UpdateUserRequest request);

    User recordLogin(User user, String subject, String provider);
}
