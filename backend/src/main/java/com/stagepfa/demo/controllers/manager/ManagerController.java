package com.stagepfa.demo.controllers.manager;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.response.TeamMemberResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
public class ManagerController {

    private final CurrentUserService currentUserService;
    private final EmployeeService employeeService;

    @GetMapping("/team")
    public ResponseEntity<PageResponse<TeamMemberResponse>> team() {
        String managerEmployeeId = requireManagerEmployeeId();

        List<TeamMemberResponse> data = employeeService.findByManager(managerEmployeeId)
                                                       .stream().map(this::toTeamMember)
                                                       .toList();

        return ResponseEntity.ok(PageResponse.<TeamMemberResponse>builder().data(data)
                                             .pagination(PaginationMeta.builder()
                                                                       .nextCursor(null)
                                                                       .hasMore(false)
                                                                       .limit(data.size())
                                                                       .build()).build());
    }

    private String requireManagerEmployeeId() {
        User user = currentUserService.requireLinkedUser();
        // Later: also check role == MANAGER. For dummy phase, linked employee is enough.
        return user.getEmployeeId();
    }

    private TeamMemberResponse toTeamMember(Employee e) {
        var profile = e.getProfile();
        var assignment = e.getCurrentAssignment();
        return TeamMemberResponse.builder().employeeId(e.getId())
                                 .employeeNumber(e.getEmployeeNumber()).firstName(
                        profile != null ? profile.getFirstName() : null)
                                 .lastName(profile != null ? profile.getLastName() : null)
                                 .email(profile != null ? profile.getEmail() : null)
                                 .departmentLabel(assignment != null ?
                                                          assignment.getDepartmentLabel() :
                                                          null).positionLabel(
                        assignment != null ? assignment.getPositionLabel() : null)
                                 .employmentStatus(e.getEmploymentStatus()).build();
    }
}
