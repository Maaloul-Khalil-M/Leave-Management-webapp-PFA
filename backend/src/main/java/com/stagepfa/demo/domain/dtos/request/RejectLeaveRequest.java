package com.stagepfa.demo.domain.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RejectLeaveRequest {

    @NotBlank(message = "Comment is required when rejecting a leave request")
    private String comment;
}
