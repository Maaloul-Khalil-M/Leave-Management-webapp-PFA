package com.stagepfa.demo.controllers.employee;


import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.response.LeaveLedgerResponse;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.mappers.LeaveLedgerMapper;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.LeaveLedgerService;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeavePolicyRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/employee/leave-ledgers")
@RequiredArgsConstructor
public class EmployeeLeaveLedgerController {

    private final CurrentUserService currentUserService;
    private final LeaveLedgerService leaveLedgerService;
    private final LeaveLedgerMapper leaveLedgerMapper;
    private final LeavePolicyRepository leavePolicyRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final EmployeeRepository employeeRepository;

    // returns all leave ledgers for the current user (employee)
    @GetMapping
    @Operation(operationId = "listCurrentEmployeeLeaveLedgers",
            summary = "List current employee leave ledgers")
    public ResponseEntity<PageResponse<LeaveLedgerResponse>> list() {
        var user = currentUserService.requireLinkedUser();
        if (user.getEmployeeId() == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "No employee linked to this account");
        }
        List<LeaveLedgerResponse> data = leaveLedgerService.findByEmployeeId(
                                                                   user.getEmployeeId())
                                                           .stream()
                                                           .map(leaveLedgerMapper::toResponse)
                                                           .peek(resp -> enrichResponse(resp, user.getEmployeeId()))
                                                           .toList();

        return ResponseEntity.ok(PageResponse.<LeaveLedgerResponse>builder()
                                             .data(data)
                                             .pagination(PaginationMeta.builder()
                                                                       .nextCursor(null)
                                                                       .hasMore(false)
                                                                       .limit(data.size())
                                                                       .build())
                                             .build());
    }

    // returns a specific leave ledger by id for the current user (employee)
    @GetMapping("/{id}")
    @Operation(operationId = "getCurrentEmployeeLeaveLedgerById",
            summary = "Get current employee leave ledger by ID")
    public ResponseEntity<LeaveLedgerResponse> getById(@PathVariable String id) {
        var user = currentUserService.requireLinkedUser();
        if (user.getEmployeeId() == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "No employee linked to this account");
        }
        var ledger = leaveLedgerService.findById(id);
        if (!user.getEmployeeId()
                 .equals(ledger.getEmployeeId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "Ledger does not belong to the current employee");
        }
        LeaveLedgerResponse response = leaveLedgerMapper.toResponse(ledger);
        enrichResponse(response, user.getEmployeeId());
        return ResponseEntity.ok(response);
    }

    private void enrichResponse(LeaveLedgerResponse resp, String employeeId) {
        if (resp == null) return;

        if (resp.getLeaveTypeCode() != null) {
            leaveTypeRepository.findByCode(resp.getLeaveTypeCode())
                    .ifPresent(lt -> resp.setLeaveTypeLabel(lt.getLabel()));
        }

        LeavePolicy policy = null;
        if (resp.getPolicyId() != null && !resp.getPolicyId().isBlank()) {
            policy = leavePolicyRepository.findById(resp.getPolicyId()).orElse(null);
        }

        if (policy == null && employeeId != null && resp.getLeaveTypeCode() != null) {
            try {
                L_CODE code = L_CODE.valueOf(resp.getLeaveTypeCode());
                var emp = employeeRepository.findById(employeeId).orElse(null);
                if (emp != null && emp.getCurrentAssignment() != null && emp.getCurrentAssignment().getCountryCode() != null) {
                    policy = leavePolicyRepository.findByCountryAndLeaveTypeCode(emp.getCurrentAssignment().getCountryCode(), code);
                }
            } catch (Exception ignored) {
            }
        }

        if (policy != null) {
            resp.setAccrualRate(policy.getAccrualRate());
            resp.setAccrualUnit(policy.getAccrualUnit() != null ? policy.getAccrualUnit().name() : null);
        }
    }
}
