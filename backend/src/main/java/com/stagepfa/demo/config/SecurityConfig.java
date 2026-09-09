package com.stagepfa.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

// Basic/starter security setup — JWT validation is on, but almost everything
// is locked to "just be logged in" (anyRequest().authenticated()).
// No fine-grained role checks yet (e.g. @PreAuthorize("hasRole('HR')") on
// specific endpoints). Add those once we know which endpoints need which roles.
/*
    example:
    public class HrController {
        // Requires the caller's JWT to carry the HR or ADMIN role
        // (realm role, or client role under resource_access.<clientId>.roles).
        @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
        @GetMapping("/employees")
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // enables @PreAuthorize on controller/service methods
public class SecurityConfig {

    // Keycloak client ID whose "resource_access" roles we read (see extractAuthorities below).
    // Only matters if you're assigning client-level roles in Keycloak; realm roles
    // (realm_access) are picked up regardless of this value.
    @Value("${app.security.client-id:angular-app}")
    private String clientId;

    // Comma-separated origins allowed to call this API, e.g. http://localhost:4200
    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CSRF protection is for cookie/session-based browser auth.
                // We're stateless + Bearer-token based, so it doesn't apply here.
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // No HTTP session — every request must carry its own JWT.
                .sessionManagement(
                        sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Health checks: needed by infra/monitoring, no token available there.
                        .requestMatchers("/actuator/health", "/actuator/info")
                        .permitAll()

                        // Anything genuinely public goes under /api/public/** — nothing does yet.
                        .requestMatchers("/api/public/**")
                        .permitAll()

                        // Swagger / OpenAPI endpoints are public.
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                         "/api-docs", "/api-docs/**")
                        .permitAll()

                        // Temporary endpoints for testing
                        .requestMatchers("/api/test", "/api/employee/**",
                                         "/api" + "/calendars/**")
                        .permitAll()

                        // Preflight requests never carry auth headers — let them through.
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()

                        // Previously: anyRequest().permitAll() ← this allowed all requests
                        // without authentication. Now: anyRequest().authenticated() — every
                        // other endpoint just requires *a* valid token, not a specific role.
                        //
                        // TODO: replace some of these with role-specific rules once roles
                        // are defined, e.g.:
                        //   .requestMatchers("/api/v1/hr/**").hasRole("HR")
                        //   .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest()
                        .authenticated())
                // This is what actually validates the JWT (signature, issuer, expiry)
                // using the issuer-uri / jwk-set-uri from application.yml, and maps
                // Keycloak roles onto Spring GrantedAuthority via the converter below.
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(
                        jwt -> jwt.jwtAuthenticationConverter(
                                jwtAuthenticationConverter())));

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // Kept from the original permit-all config — Authorization header now
        // actually matters since we validate it, so don't narrow this without
        // checking what your frontend sends.
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // Turns Keycloak's realm_access/resource_access claims into Spring
    // GrantedAuthority objects (prefixed "ROLE_") so hasRole("X") and
    // @PreAuthorize("hasRole('X')") work downstream.
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(this::extractAuthorities);
        return converter;
    }

    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        Set<String> roles = new HashSet<>();

        // Realm-level roles, e.g. { "realm_access": { "roles": ["USER", "HR"] } }
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") != null) {
            roles.addAll((Collection<String>) realmAccess.get("roles"));
        }

        // Client-level roles, scoped under resource_access.<clientId>.roles.
        // Only present if you're assigning roles at the client level in Keycloak.
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess != null) {
            Object clientAccess = resourceAccess.get(clientId);
            if (clientAccess instanceof Map<?, ?> map && map.get(
                    "roles") instanceof Collection<?> clientRoles) {
                clientRoles.forEach(r -> roles.add(String.valueOf(r)));
            }
        }

        return roles.stream()
                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                    .collect(Collectors.toSet());
    }
}
