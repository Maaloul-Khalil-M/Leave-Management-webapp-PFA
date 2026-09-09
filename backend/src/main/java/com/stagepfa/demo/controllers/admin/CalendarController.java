package com.stagepfa.demo.controllers.admin;

import com.stagepfa.demo.domain.dtos.CalendarDayDto;
import com.stagepfa.demo.domain.dtos.CalendarDto;
import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.DayType;
import com.stagepfa.demo.services.CalendarDayService;
import com.stagepfa.demo.services.CalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/calendars")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;
    private final CalendarDayService calendarDayService;

    // ====================================================================
    // Calendar
    // ====================================================================

    /**
     * Create a new calendar (e.g. code="TN-2025-2026", country=TN, year=2026).
     * Fails with 400 if the code already exists (unique index on Calendar.code).
     */
    @Operation(operationId = "createCalendar", summary = "Create a new calendar")
    @ApiResponses({@ApiResponse(responseCode = "201", description = "Calendar created"),
            @ApiResponse(responseCode = "400",
                    description = "Validation failed or calendar code already exists")})

    @PostMapping
    public ResponseEntity<CalendarDto> create(@Valid @RequestBody CalendarDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(calendarService.create(dto));
    }

    /**
     * List all calendars (e.g. TN-2025-2026, FR-2025-2026, ...).
     */
    @Operation(operationId = "listCalendars", summary = "List all calendars")

    @GetMapping
    public ResponseEntity<PageResponse<CalendarDto>> getAll() {
        List<CalendarDto> data = calendarService.getAll();
        return ResponseEntity.ok(toPageResponse(data));
    }

    /**
     * Get a single calendar by its Mongo id.
     */
    @Operation(operationId = "getCalendarById", summary = "Get a calendar by its ID")

    @GetMapping("/{id}")
    public CalendarDto getById(@PathVariable String id) {
        return calendarService.getById(id);
    }

    /**
     * Resolve a calendar directly by (country, year) instead of listing
     * everything and filtering client-side.
     * e.g. GET /api/calendars/lookup?country=TN&year=2026
     */
    @Operation(operationId = "findCalendarByCountryAndYear",
            summary = "Find a calendar by country and year")
    @ApiResponses({@ApiResponse(responseCode = "404",
            description = "No calendar found for the given country and year")})

    @GetMapping("/lookup")
    public CalendarDto findByCountryAndYear(@RequestParam CountryCode country,
                                            @RequestParam Integer year) {
        return calendarService.findByCountryAndYear(country, year);
    }

    /**
     * Update a calendar's name/country/year. "code" is intentionally not
     * changeable here since it acts as the natural business key.
     */
    @Operation(operationId = "updateCalendar", summary = "Update a calendar")
    @ApiResponses(
            {@ApiResponse(responseCode = "404", description = "Calendar not found")})

    @PutMapping("/{id}")
    public CalendarDto update(@PathVariable String id,
                              @Valid @RequestBody CalendarDto dto) {
        return calendarService.update(id, dto);
    }

    /**
     * Delete a calendar. This cascades and also deletes all CalendarDay
     * children so no orphaned days are left pointing at a dead calendarId.
     */
    @Operation(operationId = "deleteCalendar", summary = "Delete a calendar and its days")
    @ApiResponses(
            {@ApiResponse(responseCode = "404", description = "Calendar not found")})

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        calendarService.delete(id);
        return ResponseEntity.noContent()
                             .build();
    }

    // ====================================================================
    // Calendar days — nested under a specific calendar (by calendarId)
    // ====================================================================

    /**
     * Create a single day (public holiday / special working / special
     * non-working) under a specific calendar.
     */
    @Operation(operationId = "createCalendarDay",
            summary = "Create a calendar day under a calendar")
    @ApiResponses(
            {@ApiResponse(responseCode = "201", description = "Calendar day created"),
                    @ApiResponse(responseCode = "400", description = "Validation failed"),
                    @ApiResponse(responseCode = "404",
                            description = "Calendar not found")})
    @PostMapping("/{calendarId}/days")
    public ResponseEntity<CalendarDayDto> createDay(@PathVariable String calendarId,
                                                    @Valid @RequestBody
                                                    CalendarDayDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(calendarDayService.create(calendarId, dto));
    }

    /**
     * Bulk-create days under a calendar in one call, useful for seeding
     * a full year's holiday list (e.g. the 17 TN days / 10 FR days) at once
     * instead of one request per day.
     */
    @Operation(operationId = "bulkCreateCalendarDays",
            summary = "Bulk-create calendar days under a calendar")
    @ApiResponses(
            {@ApiResponse(responseCode = "201", description = "Calendar days created"),
                    @ApiResponse(responseCode = "400", description = "Validation failed"),
                    @ApiResponse(responseCode = "404",
                            description = "Calendar not found")})

    @PostMapping("/{calendarId}/days/bulk")
    public ResponseEntity<PageResponse<CalendarDayDto>> createDays(
            @PathVariable String calendarId,
            @Valid @RequestBody List<CalendarDayDto> dtos) {
        List<CalendarDayDto> data = calendarDayService.createAll(calendarId, dtos);
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(toPageResponse(data));
    }

    /**
     * List all days belonging to a specific calendar, ordered by date.
     * Optional dayType filter (PUBLIC_HOLIDAY / SPECIAL_WORKING_DAY /
     * SPECIAL_NON_WORKING_DAY) avoids pulling everything and filtering
     * client-side.
     * Spring resolves literal path segments ("/days") before path
     * variables ("/{id}") on the parent mapping, so this does not
     * collide with GET /api/calendars/{id} or GET /api/calendars/days below.
     */
    @Operation(operationId = "listCalendarDays",
            summary = "List days for a calendar, optionally filtered by day type")
    @ApiResponses(
            {@ApiResponse(responseCode = "404", description = "Calendar not found")})

    @GetMapping("/{calendarId}/days")
    public ResponseEntity<PageResponse<CalendarDayDto>> getDays(
            @PathVariable String calendarId,
            @RequestParam(required = false) DayType dayType) {
        List<CalendarDayDto> data = calendarDayService.getByCalendarId(calendarId,
                                                                       dayType);
        return ResponseEntity.ok(toPageResponse(data));
    }

    /**
     * Get a single day, scoped to its parent calendar so a dayId
     * can't be fetched under the wrong calendarId.
     */
    @Operation(operationId = "getCalendarDayById",
            summary = "Get a calendar day by ID, scoped to its calendar")
    @ApiResponses({@ApiResponse(responseCode = "404",
            description = "Calendar or day not found")})

    @GetMapping("/{calendarId}/days/{dayId}")
    public CalendarDayDto getDayById(@PathVariable String calendarId,
                                     @PathVariable String dayId) {
        return calendarDayService.getById(calendarId, dayId);
    }

    /**
     * Update a day's date / dayType / label.
     */
    @Operation(operationId = "updateCalendarDay", summary = "Update a calendar day")
    @ApiResponses({@ApiResponse(responseCode = "404",
            description = "Calendar or day not found")})

    @PutMapping("/{calendarId}/days/{dayId}")
    public CalendarDayDto updateDay(@PathVariable String calendarId,
                                    @PathVariable String dayId,
                                    @Valid @RequestBody CalendarDayDto dto) {
        return calendarDayService.update(calendarId, dayId, dto);
    }

    /**
     * Delete a single day from a calendar.
     */
    @Operation(operationId = "deleteCalendarDay", summary = "Delete a calendar day")
    @ApiResponses({@ApiResponse(responseCode = "404",
            description = "Calendar or day not found")})

    @DeleteMapping("/{calendarId}/days/{dayId}")
    public ResponseEntity<Void> deleteDay(@PathVariable String calendarId,
                                          @PathVariable String dayId) {
        calendarDayService.delete(calendarId, dayId);
        return ResponseEntity.noContent()
                             .build();
    }

    // ====================================================================
    // Convenience lookups — resolve days directly by (country, year) or
    // (country, date), without the caller needing to know the calendarId.
    // ====================================================================

    /**
     * Get all days for the calendar matching (country, year).
     * year defaults to the current year if not provided.
     * e.g. GET /api/calendars/days?country=TN&year=2026
     */
    @Operation(operationId = "getCalendarDaysByCountryAndYear",
            summary = "Get calendar days for a country and year")
    @ApiResponses({@ApiResponse(responseCode = "404",
            description = "No calendar found for the given country and year")})

    @GetMapping("/days")
    public ResponseEntity<PageResponse<CalendarDayDto>> getCurrentCalendarDays(
            @RequestParam CountryCode country,
            @RequestParam(required = false) Integer year) {
        int resolvedYear = (year != null) ? year : LocalDate.now()
                                                            .getYear();
        List<CalendarDayDto> data = calendarDayService.getByCountryAndYear(country,
                                                                           resolvedYear);
        return ResponseEntity.ok(toPageResponse(data));
    }

    /**
     * Check whether a specific date is a special day (holiday / special
     * working / special non-working) for a given country, e.g. answering
     * "is 2026-09-12 a working day for TN?" without pulling the whole year.
     * Returns 404 if the date has no CalendarDay entry (i.e. it just
     * follows the normal weekend rule from OrganizationSettings).
     * e.g. GET /api/calendars/days/check?country=TN&date=2026-09-12
     */
    @Operation(operationId = "checkSpecialDay",
            summary = "Check whether a date is a special (non-default) day for a country")
    @ApiResponses({@ApiResponse(responseCode = "404",
            description = "No CalendarDay entry for the given date; it follows the default weekend rule")})

    @GetMapping("/days/check")
    public CalendarDayDto checkDate(@RequestParam CountryCode country, @RequestParam(
            defaultValue = "#{T(java.time.LocalDate).now()}")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return calendarDayService.findByCountryAndDate(country, date);
    }

    // ====================================================================
    // Helpers
    // ====================================================================

    private <T> PageResponse<T> toPageResponse(List<T> data) {
        return PageResponse.<T>builder()
                           .data(data)
                           .pagination(PaginationMeta.builder()
                                                     .nextCursor(null)
                                                     .hasMore(false)
                                                     .limit(data.size())
                                                     .build())
                           .build();
    }
}
