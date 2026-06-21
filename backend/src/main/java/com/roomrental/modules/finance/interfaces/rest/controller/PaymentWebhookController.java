package com.roomrental.modules.finance.interfaces.rest.controller;

import com.roomrental.modules.finance.application.dto.PaymentWebhookCommand;
import com.roomrental.modules.finance.application.dto.TransactionResult;
import com.roomrental.modules.finance.application.service.PaymentService;
import com.roomrental.modules.finance.interfaces.rest.dto.SePayWebhookRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Finance - Webhook", description = "Public webhook endpoint for automated payments reconciliation")
public class PaymentWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);

    private final PaymentService paymentService;
    private static final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Value("${app.sepay.apikey:}")
    private String sepayApiKey;

    public PaymentWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/webhook")
    @Operation(summary = "Hứng Webhook từ SePay.vn khi có biến động số dư (Không cần JWT)")
    public ResponseEntity<TransactionResult> receiveWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-SePay-Key", required = false) String xSepayKey,
            @RequestBody SePayWebhookRequest request) {

        log.info("Received SePay webhook payload: transaction_id={}, amount={}, code={}, content={}",
                request.id(), request.transferAmount(), request.code(), request.content());

        // Secure endpoint via SePay Authorization header if API Key is configured
        if (sepayApiKey != null && !sepayApiKey.isBlank()) {
            boolean matched = false;
            if (authHeader != null) {
                String trimmed = authHeader.trim();
                if (trimmed.equals("Apikey " + sepayApiKey) ||
                    trimmed.equals("Bearer " + sepayApiKey) ||
                    trimmed.equals(sepayApiKey)) {
                    matched = true;
                }
            }
            if (!matched && xSepayKey != null) {
                String trimmed = xSepayKey.trim();
                if (trimmed.equals(sepayApiKey)) {
                    matched = true;
                }
            }
            if (!matched) {
                log.warn("Unauthorized webhook call: Authorization header mismatch. Expected 'Apikey {}' or custom header 'X-SePay-Key'. Got Authorization: '{}', X-SePay-Key: '{}'", 
                        sepayApiKey, authHeader, xSepayKey);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        }


        // Parse transfer description: SePay code has priority, fallback to content
        String memo = request.code() != null && !request.code().isBlank() ? request.code() : request.content();
        String transactionRef = request.referenceCode() != null && !request.referenceCode().isBlank()
                ? request.referenceCode() : "SEPAY-" + request.id();

        // Serialize the webhook request payload to JSON string for the PostgreSQL JSONB column
        String rawJson;
        try {
            rawJson = objectMapper.writeValueAsString(request);
        } catch (Exception e) {
            log.error("Failed to serialize webhook request payload", e);
            rawJson = "{\"id\":" + request.id() + ",\"content\":\"" + request.content() + "\"}";
        }

        PaymentWebhookCommand command = new PaymentWebhookCommand(
                transactionRef,
                request.transferAmount(),
                request.gateway(),
                memo,
                rawJson
        );

        TransactionResult result = paymentService.processWebhook(command);
        return ResponseEntity.ok(result);
    }
}

