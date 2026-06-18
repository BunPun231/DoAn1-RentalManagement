package com.roomrental.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Security security, Tenant tenant, Bootstrap bootstrap) {

	public record Security(String jwtSecret, long accessTokenMinutes) {
	}

	public record Tenant(String headerName) {
	}

	public record Bootstrap(Admin admin) {
	}

	public record Admin(boolean enabled, String tenantCode, String tenantName, String fullName, String email, String password) {
	}
}