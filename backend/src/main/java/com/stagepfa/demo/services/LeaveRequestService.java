package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.request.CreateLeaveRequest;
import com.stagepfa.demo.domain.entities.LeaveRequest;

import java.util.List;

public interface LeaveRequestService {

    LeaveRequest createDraft(CreateLeaveRequest request);

    List<LeaveRequest> listMine();
}
