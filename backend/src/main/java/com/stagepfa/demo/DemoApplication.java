package com.stagepfa.demo;

import io.flamingock.api.annotations.EnableFlamingock;
import io.flamingock.api.annotations.Stage;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@EnableFlamingock(
		stages = {
				@Stage(location = "com.stagepfa.demo.migrations")
		}
)
@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}

}
