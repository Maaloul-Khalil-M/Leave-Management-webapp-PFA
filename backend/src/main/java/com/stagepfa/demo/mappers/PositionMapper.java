package com.stagepfa.demo.mappers;


import com.stagepfa.demo.domain.dtos.request.CreatePositionRequest;
import com.stagepfa.demo.domain.dtos.request.UpdatePositionRequest;
import com.stagepfa.demo.domain.dtos.response.PositionResponse;
import com.stagepfa.demo.domain.entities.Position;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PositionMapper {
    PositionResponse toResponse(Position entity);

    Position toEntity(CreatePositionRequest request);

    void updateEntity(UpdatePositionRequest request, @MappingTarget Position entity);
}
