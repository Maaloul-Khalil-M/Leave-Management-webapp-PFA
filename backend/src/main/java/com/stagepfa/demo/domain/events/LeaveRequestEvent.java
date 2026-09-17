package com.stagepfa.demo.domain.events;

import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;

public record LeaveRequestEvent(
        LeaveRequest leaveRequest,
        LeaveRequestStatus fromStatus,
        LeaveRequestStatus toStatus,
        String actorUserId,
        String comment
) {}
