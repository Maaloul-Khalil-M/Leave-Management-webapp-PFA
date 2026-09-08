package com.stagepfa.demo.services.impl;


import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.entities.embedded.LedgerMovement;
import com.stagepfa.demo.domain.enums.LedgerMovementType;
import com.stagepfa.demo.services.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaveAccrualServiceImpl implements LeaveAccrualService {

    private final EmployeeService employeeService;
    private final LeaveTypeService leaveTypeService;
    private final LeavePolicyService leavePolicyService;
    private final LeaveLedgerService leaveLedgerService;
    private final BonusResolver bonusResolver;

    @Override
    @Transactional
    public void accrueForMonth(LocalDate asOf) {
        List<Employee> employees = employeeService.findAll(); // adjust to real
        // method
        List<LeaveType> accrualTypes = leaveTypeService.findAll()
                                                       .stream()
                                                       .filter(LeaveType::isDeductsFromBalance) // only types that actually accrue a balance
                                                       .toList();

        int year = asOf.getYear();

        for (Employee emp : employees) {
            // Skip employees without a country on their current assignment —
            // resolve() needs one. Adjust the accessor to match your Assignment shape.
            var country = emp.getCurrentAssignment() == null ? null :
                    emp.getCurrentAssignment()
                       .getCountryCode();
            if (country == null) {
                log.warn(
                        "Skipping accrual for employee {} — no country on current assignment",
                        emp.getId());
                continue;
            }

            for (LeaveType type : accrualTypes) {
                LeavePolicy policy;
                try {
                    policy = leavePolicyService.resolve(country, type.getCode());
                } catch (Exception e) {
                    log.warn("No policy for country={} type={}, skipping", country,
                             type.getCode());
                    continue;
                }
                if (policy == null) {
                    continue;
                }

                double rate = bonusResolver.resolveRate(policy, emp, asOf);
                if (rate <= 0) {
                    continue;
                }

                var ledger = leaveLedgerService.getOrCreate(emp.getId(), type.getCode()
                                                                             .name(),
                                                            year);

                Double cap = bonusResolver.resolveMaxBalance(policy, emp, asOf);
                double amount = rate;
                if (cap != null) {
                    double room = cap - ledger.getAvailableBalance();
                    if (room <= 0) {
                        log.debug("Employee {} already at/above cap for {}, skipping",
                                  emp.getId(), type.getCode());
                        continue;
                    }
                    amount = Math.min(amount, room);
                }

                LedgerMovement movement = LedgerMovement.builder()
                                                        .date(asOf.atStartOfDay()
                                                                  .toInstant(
                                                                          java.time.ZoneOffset.UTC))
                                                        .type(LedgerMovementType.MONTHLY_ACCRUAL)
                                                        .amount(amount)
                                                        .note("Monthly accrual " + asOf.getYear() + "-" + asOf.getMonthValue())
                                                        .leaveRequestId(null)
                                                        .actorUserId(null)
                                                        .build();

                leaveLedgerService.appendMovement(emp.getId(), type.getCode()
                                                                   .name(), year,
                                                  movement);
            }
        }
    }
}
