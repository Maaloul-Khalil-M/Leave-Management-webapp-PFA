package com.stagepfa.demo.domain.entities;


import com.stagepfa.demo.domain.enums.CountryCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "organization_settings")
public class OrganizationSettings {

    @Id
    private String id;

    private String companyName;

    private CountryCode country;

    // private String timezone;

    /**
     * Normal weekly non-working days, ISO-8601 numbering: 1=Monday … 7=Sunday.
     * Date-specific exceptions
     * (public holidays, bridge days, exceptional working days) are stored
     * separately in CalendarDay, not materialized here.
     */
    private List<Integer> weekendDays;


    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
