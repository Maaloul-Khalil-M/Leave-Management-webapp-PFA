package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;

public interface CurrentUserService {

    /**
     * Returns the User linked to the currently authenticated JWT.
     * If this is the user's first login, the identity link is created.
     * The returned User is guaranteed to have an employeeId set.
     * return the currently authenticated and linked User
     */
    User requireLinkedUser();
}
