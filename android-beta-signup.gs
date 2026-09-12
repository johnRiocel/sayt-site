/**
 * Sayt — Android beta signup processor
 * -------------------------------------
 * Attach this to the Google Form that collects beta-tester emails
 * (Form → ⋮ menu → Script editor, paste this in, save).
 *
 * What it does on every form submission:
 *   1. Reads the submitted email from the form response.
 *   2. Validates it looks like an email; ignores junk/empty submissions.
 *   3. Appends it to a "Testers" sheet tab, deduped (skips repeat sign-ups).
 *   4. Sends the signer a short confirmation email.
 *   5. Sends you a one-line notification email so you know someone signed up.
 *
 * SETUP (one-time):
 *   1. Create a Google Form with a single required "Email" question
 *      (Form → Settings → Responses → "Collect email addresses" is NOT
 *      required for this — you're asking for it as a normal short-answer
 *      question named exactly "Email").
 *   2. Form → Responses tab → click the green Sheets icon to create a
 *      linked response spreadsheet. This script uses that same spreadsheet
 *      and creates its own "Testers" tab inside it.
 *   3. Form → ⋮ (top right) → Script editor. Delete the placeholder code,
 *      paste this whole file in, and save.
 *   4. In the script editor, select the "onFormSubmit" function from the
 *      function dropdown and click Run once — Google will ask you to
 *      authorize the script (it needs permission to send email and edit
 *      the linked sheet). Approve it.
 *   5. Still in the script editor: Triggers (clock icon on the left) →
 *      Add Trigger → choose function "onFormSubmit", event source
 *      "From form", event type "On form submit". Save.
 *   6. Replace OWNER_EMAIL and PLAY_INVITE_URL below with your own values.
 *   7. Update android-beta.html on the site: replace the placeholder
 *      https://forms.gle/REPLACE_WITH_YOUR_FORM_ID with your real Form
 *      share link (Form → Send → link icon → "Shorten URL").
 *
 * Nothing here needs a server, API key or paid Google Workspace account —
 * it runs entirely inside your own free Google account.
 */

// ---- Configure these two lines ----
const OWNER_EMAIL = 'you@example.com'; // where sign-up notifications go
const PLAY_INVITE_URL = 'https://play.google.com/apps/testing/YOUR_PACKAGE_ID'; // Play Console opt-in link, once you have one
// ------------------------------------

const SHEET_NAME = 'Testers';
const EMAIL_QUESTION_TITLE = 'Email'; // must match the form question's title exactly

function onFormSubmit(e) {
  const email = extractEmail_(e);
  if (!email || !isValidEmail_(email)) {
    return; // ignore junk or missing submissions silently
  }

  const sheet = getOrCreateTestersSheet_();
  if (alreadyExists_(sheet, email)) {
    return; // don't re-notify or duplicate on repeat sign-ups
  }

  sheet.appendRow([new Date(), email]);
  notifySigner_(email);
  notifyOwner_(email);
}

function extractEmail_(e) {
  // Works whether "Collect email addresses" is on (adds e.response
  // metadata) or the email is just a normal answer field.
  if (e && e.namedValues && e.namedValues[EMAIL_QUESTION_TITLE]) {
    return String(e.namedValues[EMAIL_QUESTION_TITLE][0]).trim();
  }
  if (e && e.response) {
    const items = e.response.getItemResponses();
    for (let i = 0; i < items.length; i++) {
      if (items[i].getItem().getTitle() === EMAIL_QUESTION_TITLE) {
        return String(items[i].getResponse()).trim();
      }
    }
  }
  return null;
}

function isValidEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getOrCreateTestersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Signed up at', 'Email']);
  }
  return sheet;
}

function alreadyExists_(sheet, email) {
  const values = sheet.getRange(1, 2, Math.max(sheet.getLastRow(), 1), 1).getValues();
  return values.some(row => String(row[0]).trim().toLowerCase() === email.toLowerCase());
}

function notifySigner_(email) {
  const subject = "You're on the list for Sayt's Android beta";
  const body =
    "Thanks for signing up to test Sayt on Android.\n\n" +
    "Once a build is ready, you'll get a separate email with a Google Play " +
    "link to join closed testing and install the app.\n\n" +
    (PLAY_INVITE_URL.indexOf('YOUR_PACKAGE_ID') === -1
      ? "You can also open this Play Console opt-in link now (it won't do " +
        "anything until testing opens): " + PLAY_INVITE_URL + "\n\n"
      : '') +
    "No action needed on your end for now — just watch your inbox.";
  MailApp.sendEmail(email, subject, body);
}

function notifyOwner_(email) {
  MailApp.sendEmail(
    OWNER_EMAIL,
    'New Sayt Android beta sign-up',
    'New tester email: ' + email
  );
}

/**
 * Optional helper — run manually any time from the script editor to get a
 * newline-separated list of every tester email, ready to paste straight
 * into Play Console → Testing → Closed testing → Testers list.
 * Output appears in View → Logs (or Execution log).
 */
function exportEmailListForPlayConsole() {
  const sheet = getOrCreateTestersSheet_();
  const values = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  const emails = values.map(row => row[0]).filter(String);
  Logger.log(emails.join('\n'));
}
