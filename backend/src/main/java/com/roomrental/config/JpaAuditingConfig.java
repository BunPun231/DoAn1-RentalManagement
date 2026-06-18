package com.roomrental.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Enables JPA Auditing for automatic population of @CreatedDate / @LastModifiedDate fields.
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
