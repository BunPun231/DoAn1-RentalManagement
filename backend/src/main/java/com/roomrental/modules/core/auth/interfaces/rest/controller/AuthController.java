package com.roomrental.modules.core.auth.interfaces.rest.controller;

import com.roomrental.modules.core.auth.application.dto.AuthResult;
import com.roomrental.modules.core.auth.application.dto.LoginCommand;
import com.roomrental.modules.core.auth.application.dto.RegisterCommand;
import com.roomrental.modules.core.auth.application.service.AuthService;
import com.roomrental.modules.core.auth.interfaces.rest.dto.LoginRequestBody;
import com.roomrental.modules.core.auth.interfaces.rest.dto.RegisterRequestBody;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResult> register(@Valid @RequestBody RegisterRequestBody body) {
        return ResponseEntity.ok(authService.registerManager(new RegisterCommand(
                body.tenantName(),
                body.fullName(),
                body.email(),
                body.password()
        )));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResult> login(@Valid @RequestBody LoginRequestBody body) {
        return ResponseEntity.ok(authService.login(new LoginCommand(
                body.tenantCode(),
                body.email(),
                body.password()
        )));
    }
}
