package com.rental.rental_management.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Security security, Tenant tenant) {

    public record Security(String jwtSecret, long accessTokenMinutes) {
    }

    public record Tenant(String headerName) {
    }
}
