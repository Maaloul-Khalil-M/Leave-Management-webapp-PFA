package com.stagepfa.demo.services;


import com.stagepfa.demo.domain.entities.Position;

import java.util.List;

public interface PositionService {
    List<Position> findAll();

    Position findById(String id);

    Position create(Position position);

    Position update(String id, Position updates);
}
