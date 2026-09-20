package com.stagepfa.demo.services.impl;


import com.stagepfa.demo.domain.entities.Position;
import com.stagepfa.demo.exception.DuplicateResourceException;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.PositionRepository;
import com.stagepfa.demo.services.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PositionServiceImpl implements PositionService {

    private final PositionRepository repository;

    @Override
    public List<Position> findAll() {
        return repository.findAll();
    }

    @Override
    public Position findById(String id) {
        return repository.findById(id)
                         .orElseThrow(
                                 () -> new ResourceNotFoundException("Position", id));
    }

    @Override
    @Transactional
    public Position create(Position position) {
        if (position.getCode() == null || position.getCode().isBlank()) {
            String baseCode = generateBaseCode(position.getTitle());
            String code = baseCode;
            int counter = 1;
            while (repository.existsByCode(code)) {
                code = baseCode + "_" + counter++;
            }
            position.setCode(code);
        } else if (repository.existsByCode(position.getCode())) {
            throw new DuplicateResourceException(
                    "Position code already exists: " + position.getCode());
        }
        Instant now = Instant.now();
        position.setCreatedAt(now);
        position.setUpdatedAt(now);
        return repository.save(position);
    }

    @Override
    @Transactional
    public Position update(String id, Position updates) {
        findById(id);
        updates.setId(id);
        updates.setUpdatedAt(Instant.now());
        return repository.save(updates);
    }

    private String generateBaseCode(String title) {
        if (title == null || title.isBlank()) {
            return "POS";
        }
        String clean = title.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_");
        if (clean.startsWith("_")) {
            clean = clean.substring(1);
        }
        if (clean.endsWith("_")) {
            clean = clean.substring(0, clean.length() - 1);
        }
        if (clean.isEmpty()) {
            clean = "POS";
        }
        return clean.length() > 40 ? clean.substring(0, 40) : clean;
    }
}
