package com.stagepfa.demo.migrations;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.stagepfa.demo.domain.enums.DayType;
import io.flamingock.api.annotations.Apply;
import io.flamingock.api.annotations.Change;
import io.flamingock.api.annotations.Rollback;
import io.flamingock.api.annotations.TargetSystem;
import org.bson.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * STEP 3 — calendars + calendar_days (TN + FR public holidays 2025-2026).
 * organization_settings.weekendDays = recurring weekly pattern.
 * calendar_days = date-specific exceptions only.
 * Lunar Islamic dates should be re-validated for the shipping year.
 */
@TargetSystem(id = "leave-management-mongo")
@Change(id = "0003-seed-calendar", author = "ana")
public class _0003__SeedCalendar {

    public static final String CALENDAR_TN_ID = "665f00000000000000000090";
    public static final String CALENDAR_FR_ID = "665f00000000000000000091";

    @Apply
    public void apply(MongoDatabase db) {
        seedCalendars(db);
        seedCalendarDays(db);
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        db.getCollection("calendar_days")
          .deleteMany(new Document());
        db.getCollection("calendars")
          .deleteMany(new Document());
    }

    // -------------------------------------------------------------------------
// calendars
// -------------------------------------------------------------------------
    private void seedCalendars(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("calendars");

        if (col.countDocuments() > 0) {
            return;
        }

        Instant now = Instant.now();

        col.insertMany(
                List.of(new Document("_id", CALENDAR_TN_ID).append("code", "TN-2025-2026")
                                                           .append("name",
                                                                   "Tunisia 2025-2026")
                                                           .append("country", "TN")
                                                           .append("year", 2026)
                                                           .append("createdAt", now)
                                                           .append("updatedAt", now),

                        new Document("_id", CALENDAR_FR_ID).append("code", "FR-2025-2026")
                                                           .append("name",
                                                                   "France 2025-2026")
                                                           .append("country", "FR")
                                                           .append("year", 2026)
                                                           .append("createdAt", now)
                                                           .append("updatedAt", now)));
    }

    // -------------------------------------------------------------------------
// calendar_days
// -------------------------------------------------------------------------
    private void seedCalendarDays(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("calendar_days");

        if (col.countDocuments() > 0) {
            return;
        }

        Instant now = Instant.now();
        List<Document> days = new ArrayList<>();

        // ---- Tunisia public holidays ----
        addHoliday(days, CALENDAR_TN_ID, "2025-09-04", "Mouled (Prophet's Birthday)",
                   now);

        addHoliday(days, CALENDAR_TN_ID, "2025-10-15", "Evacuation Day", now);

        addHoliday(days, CALENDAR_TN_ID, "2025-12-17", "Revolution and Youth Day", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-01-01", "New Year's Day", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-03-20", "Independence Day", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-03-21", "Eid al-Fitr (Day 2)", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-03-22", "Eid al-Fitr (Day 3)", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-04-09", "Martyrs' Day", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-05-01", "Labour Day", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-05-27", "Eid al-Adha (Day 1)", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-05-28", "Eid al-Adha (Day 2)", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-06-16", "Islamic New Year", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-07-25", "Republic Day", now);

        addHoliday(days, CALENDAR_TN_ID, "2026-08-13", "Women's Day", now);

        // ---- Tunisia special exceptions ----
        addDay(days, CALENDAR_TN_ID, "2026-08-14", DayType.SPECIAL_NON_WORKING_DAY,
               "Company bridge day", now);

        addDay(days, CALENDAR_TN_ID, "2026-09-12", DayType.SPECIAL_WORKING_DAY,
               "Exceptional working Saturday", now);

        // ---- France public holidays ----
        addHoliday(days, CALENDAR_FR_ID, "2025-11-01", "Toussaint", now);

        addHoliday(days, CALENDAR_FR_ID, "2025-11-11", "Armistice", now);

        addHoliday(days, CALENDAR_FR_ID, "2025-12-25", "Noël", now);

        addHoliday(days, CALENDAR_FR_ID, "2026-01-01", "Jour de l'An", now);

        addHoliday(days, CALENDAR_FR_ID, "2026-04-06", "Lundi de Pâques", now);

        addHoliday(days, CALENDAR_FR_ID, "2026-05-01", "Fête du Travail", now);

        addHoliday(days, CALENDAR_FR_ID, "2026-05-08", "Victoire 1945", now);

        addHoliday(days, CALENDAR_FR_ID, "2026-05-14", "Ascension", now);

        addHoliday(days, CALENDAR_FR_ID, "2026-05-25", "Lundi de Pentecôte", now);

        addHoliday(days, CALENDAR_FR_ID, "2026-07-14", "Fête Nationale", now);

        addHoliday(days, CALENDAR_FR_ID, "2026-08-15", "Assomption", now);

        col.insertMany(days);
    }

    private static void addHoliday(List<Document> target, String calendarId,
                                   String isoDate, String label, Instant now) {
        addDay(target, calendarId, isoDate, DayType.PUBLIC_HOLIDAY, label, now);
    }

    private static void addDay(List<Document> target, String calendarId, String isoDate,
                               DayType dayType, String label, Instant now) {
        target.add(new Document().append("calendarId", calendarId)
                                 .append("date", LocalDate.parse(isoDate))
                                 .append("dayType", dayType.name())
                                 .append("label", label)
                                 .append("createdAt", now)
                                 .append("updatedAt", now));
    }
}
