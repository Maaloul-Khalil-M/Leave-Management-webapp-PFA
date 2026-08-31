package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.migrations._0002__SeedEmployeesAndUsers;
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

    private static final String DEV_USER_ID = _0002__SeedEmployeesAndUsers.USER_AHMED_ID;

    @PostConstruct
    public void init() {

        String id = DEV_USER_ID;

        System.out.println(">>> ID = [" + id + "]");
        System.out.println(">>> ID length = " + id.length());

        User byRepository = userRepository.findById(id).orElse(null);

        System.out.println(">>> repository.findById = " + byRepository);

        User byTemplate = mongoTemplate.findById(id, User.class);

        System.out.println(">>> mongoTemplate.findById = " + byTemplate);

        var raw = mongoTemplate.getCollection("users")
                               .find(new org.bson.Document("_id", id)).first();

        System.out.println(">>> raw Mongo query = " + raw);
    }

    @Override
    public User requireCurrentUser() {
        return userRepository.findById(DEV_USER_ID).orElseThrow(
                () -> new BusinessException(ErrorCode.UNAUTHORIZED,
                                            "Dummy dev user not found"));
    }
}
