// Reads the TAMU "Biweekly Pay Schedule" PDF and works out reminder deadlines.
// Works in the browser (window.PaySchedule) and in Node (module.exports) so it can be tested.
(function (root) {
    const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const DATE_RE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/g;
    const ROW_RE = /^(?:([E*])\s+)?(\d{1,2}|FY\d{2}\s?-\s?1)\s+(.*)$/;
    const DAY_MS = 86400000;

    // ---- plain date helpers, all on 'YYYY-MM-DD' strings in UTC so time zones never shift a day ----
    function toUTC(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
    function fromUTC(ms) { return new Date(ms).toISOString().slice(0, 10); }
    function addDays(iso, n) { return fromUTC(toUTC(iso) + n * DAY_MS); }
    function weekday(iso) { return new Date(toUTC(iso)).getUTCDay(); } // 0 = Sunday
    function previousWeekday(iso) {
        let d = addDays(iso, -1);
        while (weekday(d) === 0 || weekday(d) === 6) d = addDays(d, -1);
        return d;
    }

    // Group pdf.js text items ({str, x, y, width}) into lines of text, top to bottom.
    // pdf.js sometimes splits one number into single characters ("202", "6"), so pieces
    // are only separated by a space when there is a visible gap between them.
    function itemsToLines(items) {
        const rows = [];
        items.filter(it => it.str.trim()).forEach(it => {
            let row = rows.find(r => Math.abs(r.y - it.y) <= 2);
            if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
            row.items.push(it);
        });
        rows.sort((a, b) => b.y - a.y);
        return rows.map(r => {
            const sorted = r.items.sort((a, b) => a.x - b.x);
            let text = '';
            sorted.forEach((it, i) => {
                const prev = sorted[i - 1];
                const gap = prev ? it.x - (prev.x + (prev.width || 0)) : 0;
                text += (prev && gap > 1 ? ' ' : '') + it.str.trim();
            });
            return text.replace(/\s+/g, ' ').trim();
        });
    }

    // Pick the year that puts month/day closest to the anchor date.
    function closestYear(month, day, anchorIso) {
        const anchorYear = Number(anchorIso.slice(0, 4));
        let best = null;
        for (const y of [anchorYear - 1, anchorYear, anchorYear + 1]) {
            const iso = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const diff = Math.abs(toUTC(iso) - toUTC(anchorIso));
            if (!best || diff < best.diff) best = { iso, diff };
        }
        return best.iso;
    }

    // Turn the lines of one PDF into pay periods. Returns { fiscalYear, periods, problems }.
    function parseScheduleLines(lines) {
        const problems = [];
        const title = lines.find(l => /Fiscal Year \d{4}/.test(l));
        if (!title) return { fiscalYear: null, periods: [], problems: ['Could not find "Fiscal Year ####" in the PDF title.'] };
        const fiscalYear = Number(title.match(/Fiscal Year (\d{4})/)[1]);

        const periods = [];
        let anchor = `${fiscalYear - 1}-08-15`;
        for (const line of lines) {
            const m = line.match(ROW_RE);
            if (!m) continue;
            const dates = [...m[3].matchAll(DATE_RE)];
            if (dates.length < 6) continue;
            if (dates.length > 6) problems.push(`Row "${line}" has more than 6 dates; extra dates ignored.`);

            const iso = dates.slice(0, 6).map(d => closestYear(MONTHS[d[1].slice(0, 3).toLowerCase()], Number(d[2]), anchor));
            const [periodFrom, periodThru, retroDue, currentDue, finalRefresh, payDate] = iso;
            const isNextYearRow = m[2].startsWith('FY');
            periods.push({
                label: m[2].replace(/\s/g, ''),
                payPeriod: isNextYearRow ? 1 : Number(m[2]),
                fiscalYear: isNextYearRow ? 2000 + Number(m[2].slice(2, 4)) : fiscalYear,
                special: m[1] || '',
                periodFrom, periodThru, retroDue, currentDue, finalRefresh, payDate
            });
            anchor = addDays(periodFrom, 14);
        }

        // Sanity checks so a layout change is caught instead of silently producing wrong dates.
        periods.forEach((p, i) => {
            if (addDays(p.periodFrom, 13) !== p.periodThru) problems.push(`Pay period ${p.label}: ${p.periodFrom} to ${p.periodThru} is not 14 days.`);
            if (i > 0 && addDays(periods[i - 1].periodThru, 1) !== p.periodFrom) problems.push(`Pay period ${p.label} does not start the day after period ${periods[i - 1].label} ends.`);
            if (!(p.retroDue <= p.currentDue && p.currentDue < p.payDate)) problems.push(`Pay period ${p.label}: due dates are out of order.`);
        });
        if (periods.length < 26) problems.push(`Only ${periods.length} pay periods were read (expected 26 or 27).`);
        return { fiscalYear, periods, problems };
    }

    // Combine schedules from several PDFs. When two PDFs list the same pay date
    // (the "FY27-1" row at the bottom of FY26), keep the row from that year's own PDF.
    function mergeSchedules(schedules) {
        const byPayDate = new Map();
        schedules.forEach(s => s.periods.forEach(p => {
            const existing = byPayDate.get(p.payDate);
            const fromOwnPdf = s.fiscalYear === p.fiscalYear;
            if (!existing || fromOwnPdf) byPayDate.set(p.payDate, p);
        }));
        return [...byPayDate.values()].sort((a, b) => a.payDate.localeCompare(b.payDate));
    }

    // Normal pattern: retro due the Thursday before the period ends (thru - 2),
    // current due the Monday after it ends (thru + 2). Anything earlier is an early deadline.
    function deriveDeadlines(period) {
        const normalRetro = addDays(period.periodThru, -2);
        const normalCurrent = addDays(period.periodThru, 2);
        const retroEarly = period.retroDue < normalRetro;
        const currentEarly = period.currentDue < normalCurrent;
        return {
            retroEarly,
            currentEarly,
            // The schedule's due date is the approval deadline (approvals by 11 AM).
            // Employees get 5 PM on the business day before it.
            retroEmployee: `${previousWeekday(period.retroDue)}T17:00`,
            retroSupervisor: `${period.retroDue}T11:00`,
            // Current period: employees normally have until the last day of the period.
            // When the approval deadline comes first, they get the business day before it.
            currentEmployee: currentEarly ? `${previousWeekday(period.currentDue)}T17:00` : `${period.periodThru}T17:00`,
            currentSupervisor: `${period.currentDue}T11:00`
        };
    }

    function earlyReason(special) {
        if (special === 'E') return 'Payroll is using estimated time this pay period, so deadlines are earlier than usual.';
        if (special === '*') return 'A university holiday shortens payroll processing time this pay period, so deadlines are earlier than usual.';
        return 'Deadlines are earlier than usual this pay period.';
    }

    // Browser only: load a PDF (ArrayBuffer) with pdf.js and parse it.
    async function parsePdf(arrayBuffer, pdfjsLib) {
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const items = [];
        for (let n = 1; n <= doc.numPages; n++) {
            const page = await doc.getPage(n);
            const content = await page.getTextContent();
            // Offset each page so lines from different pages never merge.
            content.items.forEach(it => items.push({ str: it.str, x: it.transform[4], y: it.transform[5] - n * 10000, width: it.width }));
        }
        return parseScheduleLines(itemsToLines(items));
    }

    const api = { itemsToLines, parseScheduleLines, mergeSchedules, deriveDeadlines, earlyReason, parsePdf, addDays, previousWeekday };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.PaySchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
