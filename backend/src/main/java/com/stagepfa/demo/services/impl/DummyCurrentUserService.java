package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.migrations._0002__SeedEmployeesAndUsers;
import com.stagepfa.demo.migrations._0003__SeedSalmaAndOrganizationData;
import com.stagepfa.demo.repositories.UserRepository;
import com.stagepfa.demo.services.CurrentUserService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DummyCurrentUserService implements CurrentUserService {

    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    // DummyCurrentUserService for employee
    // private static final String DEV_USER_ID = _0002__SeedEmployeesAndUsers
    // .USER_AHMED_ID;

    // DummyCurrentUserService for manager
    private static final String DEV_USER_ID = _0003__SeedSalmaAndOrganizationData.USER_SALMA_ID;

    @Override
    public User requireCurrentUser() {
        return userRepository.findById(DEV_USER_ID).orElseThrow(
                () -> new BusinessException(ErrorCode.UNAUTHORIZED,
                                            "Dummy dev user not found"));
    }
}
