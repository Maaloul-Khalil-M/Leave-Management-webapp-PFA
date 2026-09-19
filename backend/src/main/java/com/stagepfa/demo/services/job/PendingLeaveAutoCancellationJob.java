package com.stagepfa.demo.services.job;

import com.stagepfa.demo.services.LeaveRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PendingLeaveAutoCancellationJob {

    private final LeaveRequestService leaveRequestService;

    // Runs at 00:00 every day to auto-cancel pending leaves whose start date has arrived.
    // Also configurable via app.leave.auto-cancel-cron property.
    @Scheduled(cron = "${app.leave.auto-cancel-cron:0 0 0 * * *}")
    public void runAutoCancellation() {
        log.info("Running pending leave auto-cancellation job...");
        int count = leaveRequestService.autoCancelExpiredPendingRequests();
        log.info("Pending leave auto-cancellation complete. Cancelled {} request(s).", count);
    }
}
