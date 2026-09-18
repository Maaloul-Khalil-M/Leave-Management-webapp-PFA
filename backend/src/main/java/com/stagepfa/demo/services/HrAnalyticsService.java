package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.HrAnalyticsResponse;

public interface HrAnalyticsService {
    HrAnalyticsResponse getAnalytics(String departmentId);
}
