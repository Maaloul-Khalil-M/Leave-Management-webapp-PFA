package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.request.CreateLeaveRequest;
import com.stagepfa.demo.domain.entities.LeaveRequest;

import java.util.List;

public interface LeaveRequestService {

    LeaveRequest createDraft(CreateLeaveRequest request);

    LeaveRequest submit(String id);

    LeaveRequest approve(String id, String comment);

    LeaveRequest reject(String id, String comment);

    LeaveRequest cancel(String id, String reason);

    List<LeaveRequest> listMine();

    List<LeaveRequest> listPendingTeamRequests();

    int autoCancelExpiredPendingRequests();
}
