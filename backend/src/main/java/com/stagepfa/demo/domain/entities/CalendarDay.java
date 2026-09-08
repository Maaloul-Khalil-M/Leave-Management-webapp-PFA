package com.stagepfa.demo.domain.entities;

import com.stagepfa.demo.domain.enums.DayType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;
import java.time.LocalDate;

/* date OVERRIDING the organization's normal weekly pattern */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "calendar_days")
@CompoundIndex(name = "calendarId_date_unique", def = "{'calendarId': 1, 'date': 1}",
        unique = true)
public class CalendarDay {

    //@Id
    @MongoId
    private String id;

    private String calendarId;

    private LocalDate date;
    private DayType dayType;
    private String label;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
