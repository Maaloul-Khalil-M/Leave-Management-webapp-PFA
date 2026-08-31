package com.stagepfa.demo.config;


import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MongoDebugRunner implements CommandLineRunner {

    private final MongoTemplate mongoTemplate;
    private final Environment environment;

    @Override
    public void run(String... args) {
        System.out.println("====================================");
        System.out.println(
                "spring.mongodb.uri = " + environment.getProperty("spring.mongodb.uri"));

        System.out.println("MONGODB_URI env = " + environment.getProperty("MONGODB_URI"));

        System.out.println("Mongo database = " + mongoTemplate.getDb().getName());

        System.out.println("====================================");


    }
}
