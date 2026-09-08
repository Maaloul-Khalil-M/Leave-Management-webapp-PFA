package com.stagepfa.demo.services;


import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.entities.embedded.LeaveBonus;
import com.stagepfa.demo.domain.enums.BonusApplication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Optional;

@Service
public class BonusResolver {

    public double resolveRate(LeavePolicy policy, Employee emp, LocalDate asOf) {
        List<LeaveBonus> matching = policy.getBonuses()
                                          .stream()
                                          .filter(b -> b.getAppliesTo() == BonusApplication.RATE && matches(
                                                  b, emp, asOf))
                                          .toList();

        Optional<LeaveBonus> override = matching.stream()
                                                .filter(LeaveBonus::isOverride)
                                                .findFirst();
        if (override.isPresent()) {
            return override.get()
                           .getAmount();
        }

        double rate = policy.getAccrualRate();
        for (LeaveBonus b : matching) {
            rate += occurrences(b, emp, asOf) * b.getAmount();
        }
        return rate;
    }

    public Double resolveMaxBalance(LeavePolicy policy, Employee emp, LocalDate asOf) {
        Double cap = policy.getMaxBalance();
        if (cap == null) {
            return null; // uncapped stays uncapped
        }
        for (LeaveBonus b : policy.getBonuses()) {
            if (b.getAppliesTo() != BonusApplication.MAX_BALANCE || !matches(b, emp,
                                                                             asOf)) {
                continue;
            }
            cap += occurrences(b, emp, asOf) * b.getAmount();
        }
        return cap;
    }

    private boolean matches(LeaveBonus b, Employee emp, LocalDate asOf) {
        if (b.getMinYearsOfService() != null) {
            int years = Period.between(emp.getProfile()
                                          .getHireDate(), asOf)
                              .getYears();
            if (years < b.getMinYearsOfService()) {
                return false;
            }
        }
        if (b.getMaxAge() != null) {
            int age = Period.between(emp.getProfile()
                                        .getBirthDate(), asOf)
                            .getYears();
            if (age >= b.getMaxAge()) {
                return false;
            }
        }
        return true;
    }

    private double occurrences(LeaveBonus b, Employee emp, LocalDate asOf) {
        if (b.getEveryNYears() == null) {
            return 1;
        }
        int years = Period.between(emp.getProfile()
                                      .getHireDate(), asOf)
                          .getYears();
        return Math.floor((double) years / b.getEveryNYears());
    }
}
