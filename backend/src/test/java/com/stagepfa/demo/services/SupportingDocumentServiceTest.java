package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.SupportingDocumentResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.SupportingDocument;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.ManagerRef;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.SupportingDocumentRepository;
import com.stagepfa.demo.services.impl.SupportingDocumentServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SupportingDocumentServiceTest {

    @Mock
    private SupportingDocumentRepository supportingDocumentRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private SupportingDocumentServiceImpl service;

    private User employeeUser;
    private User managerUser;

    @BeforeEach
    void setUp() {
        employeeUser = User.builder()
                .id("u1")
                .employeeId("emp-1")
                .build();

        managerUser = User.builder()
                .id("u2")
                .employeeId("mgr-1")
                .build();

        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testUploadSuccess() {
        when(currentUserService.requireLinkedUser()).thenReturn(employeeUser);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "doctor_note.pdf",
                "application/pdf",
                "Sample PDF content".getBytes()
        );

        when(supportingDocumentRepository.save(any(SupportingDocument.class))).thenAnswer(inv -> {
            SupportingDocument doc = inv.getArgument(0);
            doc.setId("doc-123");
            return doc;
        });

        SupportingDocumentResponse response = service.upload(file);

        assertNotNull(response);
        assertEquals("doc-123", response.getId());
        assertEquals("doctor_note.pdf", response.getFileName());
        assertEquals("application/pdf", response.getContentType());
        assertTrue(response.getFileSize() > 0);
        verify(supportingDocumentRepository, times(1)).save(any(SupportingDocument.class));
    }

    @Test
    void testUploadEmptyFileFails() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);

        BusinessException ex = assertThrows(BusinessException.class, () -> service.upload(file));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("empty or missing"));
    }

    @Test
    void testUploadUnsupportedContentTypeFails() {
        MockMultipartFile file = new MockMultipartFile("file", "test.exe", "application/x-msdownload", "content".getBytes());

        BusinessException ex = assertThrows(BusinessException.class, () -> service.upload(file));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Unsupported file format"));
    }

    @Test
    void testGetDocumentByOwnerSuccess() {
        when(currentUserService.requireLinkedUser()).thenReturn(employeeUser);

        SupportingDocument doc = SupportingDocument.builder()
                .id("doc-1")
                .employeeId("emp-1")
                .fileName("cert.pdf")
                .contentType("application/pdf")
                .data("test bytes".getBytes())
                .uploadedAt(Instant.now())
                .build();

        when(supportingDocumentRepository.findById("doc-1")).thenReturn(Optional.of(doc));

        SupportingDocument result = service.get("doc-1");
        assertNotNull(result);
        assertEquals("doc-1", result.getId());
        assertEquals("cert.pdf", result.getFileName());
    }

    @Test
    void testGetDocumentByManagerSuccess() {
        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);

        SupportingDocument doc = SupportingDocument.builder()
                .id("doc-1")
                .employeeId("emp-1")
                .fileName("cert.pdf")
                .contentType("application/pdf")
                .data("test bytes".getBytes())
                .uploadedAt(Instant.now())
                .build();

        Employee owner = Employee.builder()
                .id("emp-1")
                .currentManager(ManagerRef.builder().employeeId("mgr-1").build())
                .build();

        when(supportingDocumentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(owner));

        SupportingDocument result = service.get("doc-1");
        assertNotNull(result);
        assertEquals("doc-1", result.getId());
    }

    @Test
    void testGetDocumentForbiddenForUnrelatedEmployee() {
        User otherUser = User.builder().id("u3").employeeId("emp-other").build();
        when(currentUserService.requireLinkedUser()).thenReturn(otherUser);

        SupportingDocument doc = SupportingDocument.builder()
                .id("doc-1")
                .employeeId("emp-1")
                .fileName("cert.pdf")
                .build();

        Employee owner = Employee.builder()
                .id("emp-1")
                .currentManager(ManagerRef.builder().employeeId("mgr-1").build())
                .build();

        when(supportingDocumentRepository.findById("doc-1")).thenReturn(Optional.of(doc));
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(owner));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.get("doc-1"));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void testGetDocumentNotFound() {
        when(supportingDocumentRepository.findById("missing-doc")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.get("missing-doc"));
    }
}
