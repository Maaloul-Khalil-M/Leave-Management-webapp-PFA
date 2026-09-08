package com.stagepfa.demo.services;


import java.time.LocalDate;

/**
 * Runs the monthly leave accrual: for every active employee and every
 * accrual-bearing leave type, resolves the rate (base + bonuses) for that
 * employee as of the given date, and appends a MONTHLY_ACCRUAL movement
 * to their ledger.
 */
public interface LeaveAccrualService {

    /**
     * @param asOf the month being accrued for, e.g. the last day of that month
     */
    void accrueForMonth(LocalDate asOf);
}
