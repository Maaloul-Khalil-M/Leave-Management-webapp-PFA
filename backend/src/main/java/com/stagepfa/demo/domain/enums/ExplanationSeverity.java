package com.stagepfa.demo.domain.enums;

/**
 * How the UI should treat an explanation.
 * <ul>
 *   <li>INFO — context only (e.g. balance unaffected)</li>
 *   <li>WARNING — soft rule; product may still allow submit</li>
 *   <li>BLOCKING — hard rule; eligible=false</li>
 * </ul>
 */
public enum ExplanationSeverity {
    INFO,
    WARNING,
    BLOCKING
}
