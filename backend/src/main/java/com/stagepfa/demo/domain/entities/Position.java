package com.stagepfa.demo.domain.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "positions")
public class Position {
    @Id
    private String id;

    @Indexed(unique = true)
    private String code;

    private String title;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
