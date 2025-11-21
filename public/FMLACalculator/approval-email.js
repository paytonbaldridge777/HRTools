// FMLA Approval Email Generator
(function() {
    'use strict';
    
    const form = document.getElementById('emailForm');
    const loading = document.getElementById('loading');
    const emailPreview = document.getElementById('emailPreview');
    const emailContent = document.getElementById('emailContent');
    const copyBtn = document.getElementById('copyBtn');
    const outlookBtn = document.getElementById('outlookBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    let generatedEmail = null;
    let holidays = [];
    
    // Holiday scraping function
    async function scrapeHolidays() {
        try {
            // NOTE: This fetch will likely fail due to CORS restrictions.
            // The fallback to getDefaultHolidays() provides reliable holiday dates.
            // Fetch the TAMU holidays page
            const response = await fetch('https://employees.tamu.edu/employee-relations/leave/paid/university-holidays.html', {
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch holidays');
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Parse holiday dates from the page
            const holidayDates = [];
            
            // Look for date patterns in the content
            // This is a simplified approach - may need adjustment based on actual HTML structure
            const datePattern = /(\w+\s+\d{1,2},\s+\d{4})/g;
            const matches = html.match(datePattern);
            
            if (matches) {
                matches.forEach(dateStr => {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        holidayDates.push(date);
                    }
                });
            }
            
            return holidayDates;
        } catch (error) {
            console.error('Error scraping holidays:', error);
            // Fallback to hardcoded holidays for current/next year if scraping fails
            return getDefaultHolidays();
        }
    }
    
    // Fallback holidays (TAMU typical holidays)
    // TODO: Update these dates annually to reflect the current academic year holidays
    function getDefaultHolidays() {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        
        return [
            // 2025 holidays
            new Date('2025-01-01'), // New Year's Day
            new Date('2025-01-20'), // MLK Jr. Day
            new Date('2025-03-10'), // Spring Break Monday
            new Date('2025-03-11'), // Spring Break Tuesday
            new Date('2025-03-12'), // Spring Break Wednesday
            new Date('2025-03-13'), // Spring Break Thursday
            new Date('2025-03-14'), // Spring Break Friday
            new Date('2025-04-18'), // Good Friday
            new Date('2025-05-26'), // Memorial Day
            new Date('2025-06-19'), // Juneteenth
            new Date('2025-07-04'), // Independence Day
            new Date('2025-09-01'), // Labor Day
            new Date('2025-11-27'), // Thanksgiving
            new Date('2025-11-28'), // Thanksgiving Friday
            new Date('2025-12-24'), // Winter Break
            new Date('2025-12-25'), // Christmas
            new Date('2025-12-26'), // Winter Break
            new Date('2025-12-29'), // Winter Break
            new Date('2025-12-30'), // Winter Break
            new Date('2025-12-31'), // Winter Break
            // 2026 holidays (partial)
            new Date('2026-01-01'), // New Year's Day
            new Date('2026-01-19'), // MLK Jr. Day
        ].filter(date => !isNaN(date.getTime()));
    }
    
    // Check if a date is a weekend
    function isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }
    
    // Check if a date is a holiday
    function isHoliday(date, holidays) {
        return holidays.some(holiday => 
            holiday.getFullYear() === date.getFullYear() &&
            holiday.getMonth() === date.getMonth() &&
            holiday.getDate() === date.getDate()
        );
    }
    
    // Check if a date is a workday
    function isWorkday(date, holidays) {
        return !isWeekend(date) && !isHoliday(date, holidays);
    }
    
    // Calculate exhaustion date
    function calculateExhaustionDate(lastDate, hoursUsed, holidays) {
        const remainingHours = 480 - hoursUsed;
        
        if (remainingHours <= 0) {
            return lastDate; // Already exhausted
        }
        
        // Calculate number of workdays needed (8 hours per day)
        const daysNeeded = Math.ceil(remainingHours / 8);
        
        let currentDate = new Date(lastDate);
        let workdaysCount = 0;
        
        // Move forward until we've counted enough workdays
        while (workdaysCount < daysNeeded) {
            currentDate.setDate(currentDate.getDate() + 1);
            
            if (isWorkday(currentDate, holidays)) {
                workdaysCount++;
            }
        }
        
        return currentDate;
    }
    
    // Format date as MM/DD/YYYY
    function formatDate(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }
    
    // Format date as "Month Day, Year"
    function formatDateLong(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    // Generate email HTML
    function generateEmail(formData, exhaustionDate) {
        const { employeeName, hoursUsed, leaveType, startDate, endDate } = formData;
        const remainingHours = 480 - hoursUsed;
        
        const emailHTML = `
            <p>Hello ${employeeName},</p>
            
            <p>Your request for Family and Medical Leave Act (FMLA) leave has been approved.</p>
            
            <p><strong>Leave Details:</strong></p>
            <ul>
                <li><strong>Type of Leave:</strong> ${leaveType}</li>
                <li><strong>Leave Period:</strong> ${formatDateLong(new Date(startDate))} to ${formatDateLong(new Date(endDate))}</li>
                <li><strong>FMLA Hours Used to Date:</strong> ${hoursUsed} hours</li>
                <li><strong>FMLA Hours Remaining:</strong> ${remainingHours} hours</li>
                <li><strong>Estimated Exhaustion Date:</strong> ${formatDateLong(exhaustionDate)}</li>
            </ul>
            
            <p>The estimated exhaustion date is calculated based on your remaining FMLA hours (${remainingHours} hours) 
            spread across working days at 8 hours per day, excluding weekends and university holidays. This date may vary 
            based on actual leave usage.</p>
            
            <p><strong>Important Reminders:</strong></p>
            <ul>
                <li>You have a total of 480 hours (12 weeks) of FMLA leave available in a 12-month period</li>
                <li>Please submit all required documentation to HR in a timely manner</li>
                <li>Contact HR if you have questions about your leave or if your circumstances change</li>
            </ul>
            
            <p>If you have any questions or concerns, please don't hesitate to contact the Human Resources office.</p>
            
            <p>Best regards,<br>
            Human Resources<br>
            Texas A&M University School of Law</p>
        `;
        
        return emailHTML;
    }
    
    // Generate plain text version for Outlook
    function generatePlainText(formData, exhaustionDate) {
        const { employeeName, hoursUsed, leaveType, startDate, endDate } = formData;
        const remainingHours = 480 - hoursUsed;
        
        return `Hello ${employeeName},

Your request for Family and Medical Leave Act (FMLA) leave has been approved.

Leave Details:
- Type of Leave: ${leaveType}
- Leave Period: ${formatDateLong(new Date(startDate))} to ${formatDateLong(new Date(endDate))}
- FMLA Hours Used to Date: ${hoursUsed} hours
- FMLA Hours Remaining: ${remainingHours} hours
- Estimated Exhaustion Date: ${formatDateLong(exhaustionDate)}

The estimated exhaustion date is calculated based on your remaining FMLA hours (${remainingHours} hours) spread across working days at 8 hours per day, excluding weekends and university holidays. This date may vary based on actual leave usage.

Important Reminders:
- You have a total of 480 hours (12 weeks) of FMLA leave available in a 12-month period
- Please submit all required documentation to HR in a timely manner
- Contact HR if you have questions about your leave or if your circumstances change

If you have any questions or concerns, please don't hesitate to contact the Human Resources office.

Best regards,
Human Resources
Texas A&M University School of Law`;
    }
    
    // Form submit handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        loading.classList.add('active');
        emailPreview.classList.remove('active');
        
        try {
            // Get form data
            const formData = {
                employeeName: document.getElementById('employeeName').value.trim(),
                hoursUsed: parseFloat(document.getElementById('hoursUsed').value),
                lastDate: document.getElementById('lastDate').value,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                leaveType: document.getElementById('leaveType').value
            };
            
            // Validate hours
            if (formData.hoursUsed < 0 || formData.hoursUsed > 480) {
                alert('FMLA Hours Used must be between 0 and 480');
                loading.classList.remove('active');
                return;
            }
            
            // Validate dates
            const lastDateObj = new Date(formData.lastDate);
            const startDateObj = new Date(formData.startDate);
            const endDateObj = new Date(formData.endDate);
            
            if (startDateObj > endDateObj) {
                alert('Start date must be before or equal to end date');
                loading.classList.remove('active');
                return;
            }
            
            // Load holidays if not already loaded
            if (holidays.length === 0) {
                holidays = await scrapeHolidays();
            }
            
            // Calculate exhaustion date
            const exhaustionDate = calculateExhaustionDate(lastDateObj, formData.hoursUsed, holidays);
            
            // Generate email
            const emailHTML = generateEmail(formData, exhaustionDate);
            const plainText = generatePlainText(formData, exhaustionDate);
            
            // Store generated email
            generatedEmail = {
                html: emailHTML,
                text: plainText,
                subject: `FMLA Leave Approval - ${formData.employeeName}`
            };
            
            // Display email preview
            emailContent.innerHTML = emailHTML;
            emailPreview.classList.add('active');
            
            // Scroll to preview
            emailPreview.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error generating email:', error);
            alert('An error occurred while generating the email. Please try again.');
        } finally {
            loading.classList.remove('active');
        }
    });
    
    // Copy to clipboard
    copyBtn.addEventListener('click', async function() {
        if (!generatedEmail) return;
        
        try {
            // Try modern Clipboard API first
            if (navigator.clipboard && navigator.clipboard.write) {
                const htmlBlob = new Blob([generatedEmail.html], { type: 'text/html' });
                const textBlob = new Blob([generatedEmail.text], { type: 'text/plain' });
                
                const clipboardItem = new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob
                });
                
                await navigator.clipboard.write([clipboardItem]);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                // Fallback to writeText if write() is not available
                await navigator.clipboard.writeText(generatedEmail.text);
            } else {
                // Fallback to document.execCommand for older browsers
                const temp = document.createElement('div');
                temp.innerHTML = generatedEmail.html;
                document.body.appendChild(temp);
                
                const range = document.createRange();
                range.selectNodeContents(temp);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                document.execCommand('copy');
                document.body.removeChild(temp);
                selection.removeAllRanges();
            }
            
            // Show success message
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ Copied!';
            copyBtn.style.background = '#4caf50';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Copy failed:', err);
            alert('Failed to copy to clipboard. Please select and copy manually.');
        }
    });
    
    // Open in Outlook
    outlookBtn.addEventListener('click', function() {
        if (!generatedEmail) return;
        
        // Create mailto link with email content
        const subject = encodeURIComponent(generatedEmail.subject);
        const body = encodeURIComponent(generatedEmail.text);
        
        const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
        
        // Open in Outlook (or default email client)
        window.location.href = mailtoLink;
    });
    
    // Reset form
    resetBtn.addEventListener('click', function() {
        form.reset();
        emailPreview.classList.remove('active');
        generatedEmail = null;
    });
    
    // Preload holidays on page load
    scrapeHolidays().then(loadedHolidays => {
        holidays = loadedHolidays;
        console.log('Holidays loaded:', holidays.length);
    });
    
})();
