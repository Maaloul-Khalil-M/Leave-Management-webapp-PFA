package com.stagepfa.demo.controllers.me;


import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.response.LeaveLedgerResponse;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.mappers.LeaveLedgerMapper;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.LeaveLedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/me/leave-ledgers")
@RequiredArgsConstructor
public class MeLeaveLedgerController {

    private final CurrentUserService currentUserService;
    private final LeaveLedgerService leaveLedgerService;
    private final LeaveLedgerMapper leaveLedgerMapper;

    // returns all leave ledgers for the current user (employee)
    @GetMapping
    public ResponseEntity<PageResponse<LeaveLedgerResponse>> list() {
        var user = currentUserService.requireCurrentUser();
        if (user.getEmployeeId() == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "No employee linked to this account");
        }
        List<LeaveLedgerResponse> data = leaveLedgerService.findByEmployeeId(
                                                                   user.getEmployeeId())
                                                           .stream()
                                                           .map(leaveLedgerMapper::toResponse)
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
    public ResponseEntity<LeaveLedgerResponse> getById(@PathVariable String id) {
        var user = currentUserService.requireCurrentUser();
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
        return ResponseEntity.ok(leaveLedgerMapper.toResponse(ledger));
    }
}
