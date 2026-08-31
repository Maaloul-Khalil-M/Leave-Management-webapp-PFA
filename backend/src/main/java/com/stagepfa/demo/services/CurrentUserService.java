package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;

public interface CurrentUserService {
    /**
     * Always returns the current app User, or throws if none resolvable.
     */
    User requireCurrentUser();

    /**
     * requireCurrentUser() + must have a linked employeeId.
     */
    default User requireLinkedUser() {
        User user = requireCurrentUser();
        if (user.getEmployeeId() == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "No employee is linked to this account");
        }
        return user;
    }
}
