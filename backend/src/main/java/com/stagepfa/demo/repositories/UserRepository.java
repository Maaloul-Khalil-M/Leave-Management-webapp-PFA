package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.User;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {

}
