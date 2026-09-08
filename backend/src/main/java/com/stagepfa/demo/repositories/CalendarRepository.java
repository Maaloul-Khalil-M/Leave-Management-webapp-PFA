package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.Calendar;
import com.stagepfa.demo.domain.enums.CountryCode;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CalendarRepository extends MongoRepository<Calendar, String> {
    boolean existsByCode(String code);

    Optional<Calendar> findByCountryAndYear(CountryCode country, Integer year);


}
