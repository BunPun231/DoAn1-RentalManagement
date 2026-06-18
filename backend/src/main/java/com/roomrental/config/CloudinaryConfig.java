package com.roomrental.config;

import com.cloudinary.Cloudinary;
import com.roomrental.common.config.AppProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class CloudinaryConfig {

    private final AppProperties appProperties;

    public CloudinaryConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Bean
    public Cloudinary cloudinary() {
        AppProperties.Cloudinary cloudinary = appProperties.cloudinary();
        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", cloudinary.cloudName());
        config.put("api_key", cloudinary.apiKey());
        config.put("api_secret", cloudinary.apiSecret());
        return new Cloudinary(config);
    }
}
