package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.Locale;


/**
 * Resolves the authenticated request's Keycloak JWT to a User, linking
 * identity.subject on first successful login.
 * <p>
 * Merged from two drafts: keeps the UserService-backed design (no direct
 * repository access here), since that was flagged as "the real
 * implementation" that replaces DummyCurrentUserService. The entry point is
 * named requireLinkedUser() because that's what CurrentEmployeeResolver
 * actually calls.
 * <p>
 * Assumption carried over from that draft: accounts are pre-provisioned
 * (e.g. by HR/admin) with an employeeId already set on the User row before
 * anyone can log in with that email. If you instead want first-login to
 * auto-create the User from a matching Employee record, this needs
 * EmployeeRepository back and a different linkOnFirstLogin — say the word.
 */

@Service
@RequiredArgsConstructor
@Primary
public class CurrentUserServiceImpl implements CurrentUserService {

    private final UserService userService;

    /**
     * Returns the User linked to the currently authenticated JWT, creating
     * the identity link on first login. Callers (like CurrentEmployeeResolver)
     * can rely on the returned User already having an employeeId set.
     */
    public User requireLinkedUser() {
        Jwt jwt = extractJwt();
        String subject = jwt.getSubject();

        User user = userService.findBySubject(subject)
                               .orElseGet(() -> linkOnFirstLogin(jwt, subject));

        if (user.getEmployeeId() == null || user.getEmployeeId()
                                                .isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "Account is not linked to an employee — contact HR/IT");
        }

        return user;
    }

    private User linkOnFirstLogin(Jwt jwt, String subject) {
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            // Requires the "email" scope on the Keycloak client — see Phase 4.2.
            throw new BusinessException(ErrorCode.FORBIDDEN, "Token has no email claim");
        }
        email = email.trim()
                     .toLowerCase(Locale.ROOT);

        // Per recordLogin's contract: unknown email is rejected here, not created.
        // Accounts must be pre-provisioned (e.g. by HR/admin via CreateUserRequest,
        // which is also where employeeId gets set) before someone can log in.
        User user = userService.findByEmail(email)
                               .orElseThrow(
                                       () -> new BusinessException(ErrorCode.FORBIDDEN,
                                                                   "No account " + "provisioned" + " for your " + "email — " + "contact HR/IT"));

        return userService.recordLogin(user, subject, "KEYCLOAK");
    }

    private Jwt extractJwt() {
        Authentication auth = SecurityContextHolder.getContext()
                                                   .getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            return jwtAuth.getToken();
        }
        // Shouldn't happen behind the resource-server filter chain, but fail loudly
        // rather than silently returning null if this is ever called off a public route.
        throw new BusinessException(ErrorCode.UNAUTHORIZED,
                                    "No authenticated JWT present");
    }
}
