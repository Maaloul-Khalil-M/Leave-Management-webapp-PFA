package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByIdentitySubject(String subject);

    // Fast path after first link (uses compound unique index)
    Optional<User> findByIdentityProviderAndIdentitySubject(String provider,
                                                            String subject);

    // First-login helpers
    Optional<User> findByEmailIgnoreCase(String email);

}
