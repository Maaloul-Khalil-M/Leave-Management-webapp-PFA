import { describe, it, expect } from 'vitest';
import { buildCsv, parseCsv, escapeCsv } from './csv-parser';

describe('csv-parser', () => {
  it('should escape values containing commas, quotes, and newlines', () => {
    expect(escapeCsv('Simple')).toBe('Simple');
    expect(escapeCsv('Hello, World')).toBe('"Hello, World"');
    expect(escapeCsv('Hello "World"')).toBe('"Hello ""World"""');
    expect(escapeCsv('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    expect(escapeCsv(null)).toBe('');
    expect(escapeCsv(undefined)).toBe('');
  });

  it('should build a formatted CSV string', () => {
    const headers = ['id', 'name', 'notes'];
    const rows = [
      ['1', 'Alice', 'Engineer, Senior'],
      ['2', 'Bob', 'Lead "Manager"'],
    ];

    const csv = buildCsv(headers, rows);
    expect(csv).toContain('id,name,notes');
    expect(csv).toContain('1,Alice,"Engineer, Senior"');
    expect(csv).toContain('2,Bob,"Lead ""Manager"""');
  });

  it('should parse standard CSV text', () => {
    const raw = `employeeNumber,firstName,lastName,email\nEMP-001,John,Doe,john@example.com\nEMP-002,Jane,Smith,jane@example.com`;
    const parsed = parseCsv(raw);

    expect(parsed.headers).toEqual(['employeeNumber', 'firstName', 'lastName', 'email']);
    expect(parsed.rows.length).toBe(2);
    expect(parsed.rows[0]['employeeNumber']).toBe('EMP-001');
    expect(parsed.rows[0]['firstName']).toBe('John');
    expect(parsed.rows[1]['email']).toBe('jane@example.com');
  });

  it('should parse CSV with quotes and commas inside cells', () => {
    const raw = `code,department,role\n101,"Engineering, Core","Lead ""Architect"""\n102,Sales,Rep`;
    const parsed = parseCsv(raw);

    expect(parsed.rows.length).toBe(2);
    expect(parsed.rows[0]['department']).toBe('Engineering, Core');
    expect(parsed.rows[0]['role']).toBe('Lead "Architect"');
    expect(parsed.rows[1]['department']).toBe('Sales');
  });

  it('should ignore empty lines and handle CRLF', () => {
    const raw = "id,name\r\n1,Alice\r\n\r\n2,Bob\r\n\r\n";
    const parsed = parseCsv(raw);

    expect(parsed.rows.length).toBe(2);
    expect(parsed.rows[0]['name']).toBe('Alice');
    expect(parsed.rows[1]['name']).toBe('Bob');
  });
});
