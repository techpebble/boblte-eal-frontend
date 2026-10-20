/**
 * A spreadsheet treats a cell starting with = + - or @ as a formula, so an
 * exported value like "-1200" or "=cmd" can run as one when the file is opened.
 * Prefixing with an apostrophe keeps it text.
 */
const neutralise = (value) => {
    const text = value == null ? '' : String(value);
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

const cell = (value) => `"${neutralise(value).replace(/"/g, '""')}"`;

/**
 * Builds a CSV from `columns` ({ header, value }) and hands it to the browser
 * as a download. The API has no export endpoint, so this works from the rows
 * already on screen — which also means it exports exactly what you can see.
 */
export const downloadCsv = (filename, columns, rows) => {
    const lines = [
        columns.map((column) => cell(column.header)).join(','),
        ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(','))
    ];

    // The BOM keeps Excel from mangling non-ASCII company names.
    const blob = new Blob(['﻿', lines.join('\r\n')], {
        type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
