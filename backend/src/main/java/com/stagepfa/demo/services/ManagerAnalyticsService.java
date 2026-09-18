package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.ManagerAnalyticsResponse;

public interface ManagerAnalyticsService {
    ManagerAnalyticsResponse getAnalytics(String scope);
}
