package com.stagepfa.demo.services.job;


import com.stagepfa.demo.services.LeaveAccrualService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;

//rely on this as cron expression to run the job at 2am on the first of every month
//TODO: make as endpoint to trigger the job manually for testing purposes

@Slf4j
@Component
@RequiredArgsConstructor
public class MonthlyLeaveAccrualJob {

    private final LeaveAccrualService leaveAccrualService;

    // Runs 02:00 on the 1st of every month, accrues for the month that just ended.
    @Scheduled(cron = "0 0 2 1 * *")
    public void runMonthlyAccrual() {
        LocalDate asOf = YearMonth.now()
                                  .minusMonths(1)
                                  .atEndOfMonth();
        log.info("Running monthly leave accrual for {}", asOf);
        leaveAccrualService.accrueForMonth(asOf);
        log.info("Monthly leave accrual complete for {}", asOf);
    }
}
