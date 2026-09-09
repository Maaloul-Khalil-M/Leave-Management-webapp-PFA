package com.stagepfa.demo.controllers;

import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.services.CurrentEmployeeResolver;
import com.stagepfa.demo.services.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class testController {
    private final CurrentEmployeeResolver employeeResolver;

    @GetMapping
    /*
    public Employee me() {
        return employeeResolver.requireActiveEmployee();
    }

     */ public String me() {
        return "Hello World";
    }

}
