package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.request.LeaveAdjustmentRequest;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import com.stagepfa.demo.domain.entities.embedded.LedgerMovement;
import com.stagepfa.demo.domain.enums.LedgerMovementType;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveLedgerRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.LeaveLedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveLedgerServiceImpl implements LeaveLedgerService {

    private static final EnumSet<LedgerMovementType> CREDIT_TYPES = EnumSet.of(
            LedgerMovementType.MONTHLY_ACCRUAL, LedgerMovementType.CARRY_OVER,
            LedgerMovementType.CANCELLED_LEAVE_CREDIT,
            LedgerMovementType.HR_ADJUSTMENT_CREDIT,
            LedgerMovementType.CORRECTION_CREDIT);

    private static final EnumSet<LedgerMovementType> DEBIT_TYPES = EnumSet.of(
            LedgerMovementType.APPROVED_LEAVE_DEBIT,
            LedgerMovementType.HR_ADJUSTMENT_DEBIT, LedgerMovementType.CORRECTION_DEBIT);

    private static final Set<LedgerMovementType> ADJUSTMENT_TYPES = Set.of(
            LedgerMovementType.HR_ADJUSTMENT_CREDIT,
            LedgerMovementType.HR_ADJUSTMENT_DEBIT, LedgerMovementType.CORRECTION_CREDIT,
            LedgerMovementType.CORRECTION_DEBIT);

    private final LeaveLedgerRepository ledgerRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;

    @Override
    public List<LeaveLedger> findByEmployeeId(String employeeId) {
        return ledgerRepository.findByEmployeeId(employeeId);
    }

    @Override
    public LeaveLedger findById(String id) {
        return ledgerRepository.findById(id)
                               .orElseThrow(
                                       () -> new ResourceNotFoundException("LeaveLedger",
                                                                           id));
    }

    @Override
    @Transactional
    public LeaveLedger getOrCreate(String employeeId, String leaveTypeCode, int year) {
        return ledgerRepository.findByEmployeeIdAndLeaveTypeCodeAndYear(employeeId,
                                                                        leaveTypeCode,
                                                                        year)
                               .orElseGet(() -> createLedger(employeeId, leaveTypeCode,
                                                             year));
    }

    private LeaveLedger createLedger(String employeeId, String leaveTypeCode, int year) {
        validateEmployee(employeeId);
        validateLeaveType(leaveTypeCode);

        LeaveLedger ledger = LeaveLedger.builder()
                                        .employeeId(employeeId)
                                        .leaveTypeCode(leaveTypeCode)
                                        .year(year)
                                        .accruedToDate(0)
                                        .consumedBalance(0)
                                        .carriedOver(0)
                                        .availableBalance(0)
                                        .movements(new ArrayList<>())
                                        .build();

        return ledgerRepository.save(ledger);
    }

    private void validateEmployee(String employeeId) {
        employeeRepository.findById(employeeId)
                          .orElseThrow(() -> new ResourceNotFoundException("Employee",
                                                                           employeeId));
    }

    private void validateLeaveType(String leaveTypeCode) {
        leaveTypeRepository.findByCode(leaveTypeCode)
                           .orElseThrow(() -> new ResourceNotFoundException("LeaveType",
                                                                            leaveTypeCode));
    }

    /**
     * Appends a movement to the ledger without modifying existing movements.
     * Balances are updated based on the movement type and amount.
     */
    @Override
    @Transactional
    public LeaveLedger appendMovement(String employeeId, String leaveTypeCode, int year,
                                      LedgerMovement movement) {

        LeaveLedger ledger = getOrCreate(employeeId, leaveTypeCode, year);

        validateMovement(movement);
        ensureMovementsInitialized(ledger);

        applyMovement(ledger, movement);

        if (movement.getDate() == null) {
            movement.setDate(Instant.now());
        }

        ledger.getMovements()
              .add(movement);

        return ledgerRepository.save(ledger);
    }

    @Override
    @Transactional
    public LeaveLedger adjust(LeaveAdjustmentRequest request, String actorUserId) {
        validateAdjustmentType(request.getType());

        LedgerMovement movement = LedgerMovement.builder()
                                                .date(Instant.now())
                                                .type(request.getType())
                                                .amount(request.getAmount())
                                                .note(request.getNote())
                                                .actorUserId(actorUserId)
                                                .build();

        return appendMovement(request.getEmployeeId(), request.getLeaveTypeCode(),
                              request.getYear(), movement);
    }

    private void validateAdjustmentType(LedgerMovementType type) {
        if (!ADJUSTMENT_TYPES.contains(type)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                                        "Adjustment must use an HR adjustment or correction movement type");
        }
    }

    private void validateMovement(LedgerMovement movement) {
        if (movement.getAmount() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                                        "Movement amount must not be zero");
        }

        if (movement.getType() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                                        "Movement type must not be null");
        }
    }

    private void ensureMovementsInitialized(LeaveLedger ledger) {
        if (ledger.getMovements() == null) {
            ledger.setMovements(new ArrayList<>());
        }
    }

    private void applyMovement(LeaveLedger ledger, LedgerMovement movement) {
        LedgerMovementType type = movement.getType();
        double amount = Math.abs(movement.getAmount());

        if (CREDIT_TYPES.contains(type)) {
            applyCredit(ledger, movement, type, amount);
            return;
        }

        if (DEBIT_TYPES.contains(type)) {
            applyDebit(ledger, movement, type, amount);
            return;
        }

        throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                                    "Unsupported movement type: " + type);
    }

    private void applyCredit(LeaveLedger ledger, LedgerMovement movement,
                             LedgerMovementType type, double amount) {

        movement.setAmount(amount);

        if (type == LedgerMovementType.MONTHLY_ACCRUAL || type == LedgerMovementType.CARRY_OVER) {
            ledger.setAccruedToDate(ledger.getAccruedToDate() + amount);
        }

        if (type == LedgerMovementType.CARRY_OVER) {
            ledger.setCarriedOver(ledger.getCarriedOver() + amount);
        }

        ledger.setAvailableBalance(ledger.getAvailableBalance() + amount);
    }

    private void applyDebit(LeaveLedger ledger, LedgerMovement movement,
                            LedgerMovementType type, double amount) {

        movement.setAmount(-amount);

        if (type == LedgerMovementType.APPROVED_LEAVE_DEBIT) {
            ledger.setConsumedBalance(ledger.getConsumedBalance() + amount);
        }

        double newAvailableBalance = ledger.getAvailableBalance() - amount;

        if (newAvailableBalance < -0.0001) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_BALANCE,
                                        "Insufficient leave balance. Available: " + ledger.getAvailableBalance() + ", required: " + amount);
        }

        ledger.setAvailableBalance(Math.max(0, newAvailableBalance));
    }

}
