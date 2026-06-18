package com.roomrental.common.security;

import com.roomrental.common.util.TenantContext;
import com.roomrental.common.security.JwtTokenService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                Claims claims = jwtTokenService.parse(token);
                String role = claims.get("role", String.class);
                String tenantId = claims.get("tenantId", String.class);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        claims.getSubject(),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);

                if (StringUtils.hasText(tenantId)) {
                    TenantContext.setCurrentTenantId(tenantId);
                }
            } catch (Exception ex) {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"code\":\"MSG04\",\"message\":\"Invalid token\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
