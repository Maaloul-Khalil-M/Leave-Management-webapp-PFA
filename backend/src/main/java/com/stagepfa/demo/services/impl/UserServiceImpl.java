package com.stagepfa.demo.services.impl;


import com.stagepfa.demo.domain.dtos.request.CreateUserRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateUserRequest;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.Identity;
import com.stagepfa.demo.domain.enums.AccountStatus;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.DuplicateResourceException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.UserRepository;
import com.stagepfa.demo.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    // Optional: only keep if employeeId must reference a real Employee doc.
    // Drop this dependency + the check in create()/update() if that's not a rule yet.
    private final EmployeeRepository employeeRepository;

    @Override
    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Override
    public User findById(String id) {
        return userRepository.findById(id)
                             .orElseThrow(
                                     () -> new ResourceNotFoundException("User", id));
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email);
    }

    @Override
    public Optional<User> findBySubject(String subject) {
        // Will back real auth resolution once Angular + Keycloak are wired in:
        // a security filter will pull "sub" out of the validated JWT and call
        // this instead of DummyCurrentUserService.
        return userRepository.findByIdentitySubject(subject);
    }

    @Override
    @Transactional
    public User create(CreateUserRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new DuplicateResourceException(
                    "User email already exists: " + request.getEmail());
        }

        if (request.getEmployeeId() != null) {
            employeeRepository.findById(request.getEmployeeId())
                              .orElseThrow(() -> new ResourceNotFoundException("Employee",
                                                                               request.getEmployeeId()));
        }

        Instant now = Instant.now();

        User user = User.builder()
                        .email(request.getEmail()
                                      .trim()
                                      .toLowerCase(Locale.ROOT))
                        .employeeId(request.getEmployeeId())
                        .accountStatus(AccountStatus.PENDING_ACTIVATION)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User update(String id, UpdateUserRequest request) {
        User existing = findById(id);

        if (request.getAccountStatus() != null) {
            existing.setAccountStatus(request.getAccountStatus());
        }
        if (request.getEmployeeId() != null) {
            if (request.getEmployeeId()
                       .isBlank()) {
                existing.setEmployeeId(null);
            } else {
                employeeRepository.findById(request.getEmployeeId())
                                  .orElseThrow(
                                          () -> new ResourceNotFoundException("Employee",
                                                                              request.getEmployeeId()));
                existing.setEmployeeId(request.getEmployeeId());
            }
        }

        existing.setUpdatedAt(Instant.now());
        return userRepository.save(existing);
    }

    /**
     * First-login linking (BR-1 / BR-2): identity subject is linked only once.
     * Unknown email -> reject upstream (caller resolves User by email first).
     * Subject mismatch on an already-linked identity -> reject.
     * <p>
     * NOTE: today this is invoked manually / via DummyCurrentUserService flows.
     * Once Angular + Keycloak are in place, this becomes the callback used by
     * a JWT-validating filter/interceptor on first successful login: it will
     * extract "sub" (and optionally "iss" as provider) from the token and call
     * recordLogin(user, sub, issuer) to link the account, exactly as here.
     */
    @Override
    @Transactional
    public User recordLogin(User user, String subject, String provider) {
        if (subject == null || subject.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "Identity subject is missing");
        }

        String resolvedProvider =
                provider != null && !provider.isBlank() ? provider : "KEYCLOAK";

        Identity identity = user.getIdentity();

        if (identity != null && identity.getSubject() != null) {
            if (!identity.getSubject()
                         .equals(subject)) {
                throw new BusinessException(ErrorCode.FORBIDDEN,
                                            "Identity subject mismatch for user: " + user.getEmail());
            }

            // Same subject = idempotent login.
        } else {
            user.setIdentity(Identity.builder()
                                     .provider(resolvedProvider)
                                     .subject(subject)
                                     .build());
        }

        if (user.getAccountStatus() == AccountStatus.SUSPENDED || user.getAccountStatus() == AccountStatus.ARCHIVED) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "Account is " + user.getAccountStatus() + " and cannot log in");
        }

        if (user.getAccountStatus() == AccountStatus.PENDING_ACTIVATION) {
            user.setAccountStatus(AccountStatus.ACTIVE);
        }

        user.setUpdatedAt(Instant.now());

        return userRepository.save(user);
    }
}
