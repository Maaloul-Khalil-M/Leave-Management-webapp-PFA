package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.request.AssignmentRequest;
import com.stagepfa.demo.domain.dtos.request.CreateEmployeeRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateEmployeeRequest;
import com.stagepfa.demo.domain.entities.Department;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.Position;
import com.stagepfa.demo.domain.entities.embedded.Assignment;
import com.stagepfa.demo.domain.entities.embedded.ManagerRef;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.exception.DuplicateResourceException;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.mappers.EmployeeMapper;
import com.stagepfa.demo.repositories.DepartmentRepository;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.PositionRepository;
import com.stagepfa.demo.services.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmployeeServiceImpl implements EmployeeService {


    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final EmployeeMapper employeeMapper;

    @Override
    public List<Employee> findAll() {
        return employeeRepository.findAll();
    }

    @Override
    public Employee findById(String id) {
        return employeeRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Employee", id));
    }

    @Override
    @Transactional
    public Employee create(CreateEmployeeRequest request) {
        if (employeeRepository.existsByEmployeeNumber(request.getEmployeeNumber())) {
            throw new DuplicateResourceException(
                    "Employee number already exists: " + request.getEmployeeNumber());
        }
        if (employeeRepository.existsByProfileEmailIgnoreCase(request.getEmail())) {
            throw new DuplicateResourceException(
                    "Employee email already exists: " + request.getEmail());
        }

        Employee employee = employeeMapper.toEntity(request);
        if (employee.getEmploymentStatus() == null) {
            employee.setEmploymentStatus(EmploymentStatus.ACTIVE);
        }

        Instant now = Instant.now();
        employee.setCreatedAt(now);
        employee.setUpdatedAt(now);

        Assignment currentAssignment = buildAssignment(request.getInitialAssignment());
        employee.setCurrentAssignment(currentAssignment);

        List<Assignment> history = new ArrayList<>();
        history.add(currentAssignment);
        employee.setAssignmentHistory(history);

        if (request.getManagerEmployeeId() != null) {
            employee.setCurrentManager(
                    managerRefOf(findById(request.getManagerEmployeeId())));
        }

        return employeeRepository.save(employee);
    }

    @Override
    @Transactional
    public Employee update(String id, UpdateEmployeeRequest request) {
        Employee existing = findById(id);

        if (request.getEmploymentStatus() != null) {
            existing.setEmploymentStatus(request.getEmploymentStatus());
        }

        if (existing.getProfile() != null) {
            employeeMapper.updateProfile(request, existing.getProfile());
        }

        if (request.getNewAssignment() != null) {
            applyTransfer(existing, request.getNewAssignment());
        }

        // Note: null here means "leave manager unchanged", not "clear manager" -
        // this DTO has no way to explicitly unset a manager. Add a separate
        // endpoint/flag if that's a real use case.
        if (request.getManagerEmployeeId() != null) {
            existing.setCurrentManager(
                    managerRefOf(findById(request.getManagerEmployeeId())));
        }

        existing.setUpdatedAt(Instant.now());
        return employeeRepository.save(existing);
    }


    //

    private void applyTransfer(Employee employee,
                               AssignmentRequest newAssignmentRequest) {
        Assignment previous = employee.getCurrentAssignment();
        if (previous != null && previous.getEndDate() == null) {
            // close out the old assignment as of the new one's start date
            previous.setEndDate(newAssignmentRequest.getStartDate());
        }

        Assignment newAssignment = buildAssignment(newAssignmentRequest);

        List<Assignment> history = employee.getAssignmentHistory();
        if (history == null) {
            history = new ArrayList<>();
        }
        history.add(newAssignment);

        employee.setAssignmentHistory(history);
        employee.setCurrentAssignment(newAssignment);
    }

    private Assignment buildAssignment(AssignmentRequest request) {
        Department dept = departmentRepository.findById(request.getDepartmentId())
                                              .orElseThrow(
                                                      () -> new ResourceNotFoundException(
                                                              "Department",
                                                              request.getDepartmentId()));
        Position pos = positionRepository.findById(request.getPositionId()).orElseThrow(
                () -> new ResourceNotFoundException("Position", request.getPositionId()));

        return Assignment.builder().departmentId(dept.getId())
                         .departmentLabel(dept.getLabel()).positionId(pos.getId())
                         .positionLabel(pos.getTitle()).startDate(request.getStartDate())
                         .endDate(request.getEndDate()).build();
    }

    private ManagerRef managerRefOf(Employee manager) {
        String managerName = manager.getProfile() != null ?
                manager.getProfile().getFirstName() + " " + manager.getProfile()
                                                                   .getLastName() :
                manager.getEmployeeNumber();
        return ManagerRef.builder().employeeId(manager.getId()).name(managerName).build();
    }

    @Override
    public List<Employee> findByManager(String managerEmployeeId) {
        return employeeRepository.findByCurrentManagerEmployeeId(managerEmployeeId);
    }
}
