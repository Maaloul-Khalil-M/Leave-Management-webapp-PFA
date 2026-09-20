package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.Position;
import com.stagepfa.demo.exception.DuplicateResourceException;
import com.stagepfa.demo.repositories.PositionRepository;
import com.stagepfa.demo.services.impl.PositionServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PositionServiceTest {

    @Mock
    private PositionRepository repository;

    @InjectMocks
    private PositionServiceImpl positionService;

    @Test
    void create_shouldAutoGenerateCodeWhenCodeIsBlank() {
        Position position = Position.builder()
                .title("DevOps Engineer")
                .departmentId("dept-123")
                .build();

        when(repository.existsByCode("DEVOPS_ENGINEER")).thenReturn(false);
        when(repository.save(any(Position.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Position result = positionService.create(position);

        assertNotNull(result);
        assertEquals("DEVOPS_ENGINEER", result.getCode());
        assertEquals("dept-123", result.getDepartmentId());
        assertNotNull(result.getCreatedAt());
        assertNotNull(result.getUpdatedAt());
        verify(repository).save(any(Position.class));
    }

    @Test
    void create_shouldThrowWhenExplicitCodeExists() {
        Position position = Position.builder()
                .code("BE_DEV")
                .title("Backend Developer")
                .departmentId("dept-123")
                .build();

        when(repository.existsByCode("BE_DEV")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> positionService.create(position));
        verify(repository, never()).save(any());
    }

    @Test
    void update_shouldUpdateDepartmentIdAndTimestamp() {
        Position existing = Position.builder()
                .id("pos-1")
                .code("BE_DEV")
                .title("Backend Developer")
                .departmentId("dept-old")
                .build();

        Position updates = Position.builder()
                .title("Senior Backend Developer")
                .departmentId("dept-new")
                .build();

        when(repository.findById("pos-1")).thenReturn(Optional.of(existing));
        when(repository.save(any(Position.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Position result = positionService.update("pos-1", updates);

        assertNotNull(result);
        assertEquals("pos-1", result.getId());
        assertEquals("dept-new", result.getDepartmentId());
        assertNotNull(result.getUpdatedAt());
    }
}
