package com.stagepfa.demo.mappers;


import com.stagepfa.demo.domain.dtos.response.LeaveLedgerResponse;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeaveLedgerMapper {
    @Mapping(source = "carriedOver", target = "carriedOverFromPreviousYear")
    LeaveLedgerResponse toResponse(LeaveLedger entity);
}
