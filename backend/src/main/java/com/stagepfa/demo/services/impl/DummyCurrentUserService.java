package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
//import com.stagepfa.demo.migrations._0002__SeedEmployeesAndUsers;
import com.stagepfa.demo.migrations._0004__SeedDemoWorkforce;
import com.stagepfa.demo.repositories.UserRepository;
import com.stagepfa.demo.services.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DummyCurrentUserService implements CurrentUserService {

    private final UserRepository userRepository;
    // DummyCurrentUserService for manager
    private static final String DEV_USER_ID = _0004__SeedDemoWorkforce.USER_SALMA_ID;


    @Override
    public User requireCurrentUser() {
        return userRepository.findById(DEV_USER_ID)
                             .orElseThrow(
                                     () -> new BusinessException(ErrorCode.UNAUTHORIZED,
                                                                 "Dummy dev user not found"));
    }
}
