package com.stagepfa.demo.controllers.hr;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.request.LeaveAdjustmentRequest;
import com.stagepfa.demo.domain.dtos.response.LeaveLedgerResponse;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.mappers.LeaveLedgerMapper;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeavePolicyRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.LeaveLedgerService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('HR', 'ADMIN')")
public class HrLeaveLedgerController {

    private final LeaveLedgerService leaveLedgerService;
    private final CurrentUserService currentUserService;
    private final LeaveLedgerMapper leaveLedgerMapper;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeavePolicyRepository leavePolicyRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Record an HR adjustment or correction to an employee leave ledger.
     * Supports both /api/hr/leave-adjustments and /api/hr/leave-ledgers/adjust.
     */
    @PostMapping(value = {"/leave-adjustments", "/leave-ledgers/adjust"})
    @Operation(operationId = "adjustLeaveLedger", summary = "Record an HR adjustment or correction to an employee leave ledger")
    public ResponseEntity<LeaveLedgerResponse> adjust(
            @Valid @RequestBody LeaveAdjustmentRequest request) {
        User currentUser = currentUserService.requireUser();
        LeaveLedger ledger = leaveLedgerService.adjust(request, currentUser.getId());
        LeaveLedgerResponse response = leaveLedgerMapper.toResponse(ledger);
        enrichResponse(response, request.getEmployeeId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Returns all leave ledgers for a given employee, optionally filtered by year.
     */
    @GetMapping("/leave-ledgers")
    @Operation(operationId = "listEmployeeLeaveLedgersForHr", summary = "List leave ledgers for an employee")
    public ResponseEntity<PageResponse<LeaveLedgerResponse>> list(
            @RequestParam String employeeId,
            @RequestParam(required = false) Integer year) {
        List<LeaveLedger> ledgers = (year != null)
                ? leaveLedgerService.findByEmployeeIdAndYear(employeeId, year)
                : leaveLedgerService.findByEmployeeId(employeeId);

        List<LeaveLedgerResponse> data = ledgers.stream()
                .map(leaveLedgerMapper::toResponse)
                .peek(resp -> enrichResponse(resp, employeeId))
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

    /**
     * Returns a specific leave ledger by id.
     */
    @GetMapping("/leave-ledgers/{id}")
    @Operation(operationId = "getLeaveLedgerByIdForHr", summary = "Get leave ledger by ID")
    public ResponseEntity<LeaveLedgerResponse> getById(@PathVariable String id) {
        LeaveLedger ledger = leaveLedgerService.findById(id);
        LeaveLedgerResponse response = leaveLedgerMapper.toResponse(ledger);
        enrichResponse(response, ledger.getEmployeeId());
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
