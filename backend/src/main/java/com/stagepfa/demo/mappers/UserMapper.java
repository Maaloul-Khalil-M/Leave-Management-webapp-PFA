package com.stagepfa.demo.mappers;

import com.stagepfa.demo.domain.dtos.response.UserResponse;
import com.stagepfa.demo.domain.entities.User;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {
    UserResponse toResponse(User entity);
}

