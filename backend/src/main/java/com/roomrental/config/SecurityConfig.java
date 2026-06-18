package com.roomrental.config;

import com.roomrental.common.security.JwtAuthenticationFilter;
import com.roomrental.common.security.TenantContextFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(
			HttpSecurity http,
			TenantContextFilter tenantContextFilter,
			JwtAuthenticationFilter jwtAuthenticationFilter
	) throws Exception {
		http
				.csrf(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								"/actuator/health",
								"/v3/api-docs/**",
								"/swagger-ui/**",
								"/swagger-ui.html",
								"/api/public/**",
								"/api/public/auth/**"
						).permitAll()
						.anyRequest().authenticated()
				)
				.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterBefore(tenantContextFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
}