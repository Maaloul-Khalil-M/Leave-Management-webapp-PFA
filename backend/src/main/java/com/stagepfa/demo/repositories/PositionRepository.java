package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.Position;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PositionRepository extends MongoRepository<Position, String> {
    Optional<Position> findByCode(String code);

    boolean existsByCode(String code);
}
