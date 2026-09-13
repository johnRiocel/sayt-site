/**
 * Sayt — Android beta signup, fully self-provisioning
 * -----------------------------------------------------
 * This ONE script builds the whole thing for you: it creates the Google
 * Form, adds the "Email" question, creates a linked response Spreadsheet,
 * and installs the on-submit trigger — you don't have to click through
 * Google's UI to build the Form by hand at all.
 *
 * SETUP (one-time, ~2 minutes):
 *   1. Go to script.google.com → New project.
 *   2. Delete the placeholder code in Code.gs, paste this whole file in.
 *   3. Edit OWNER_EMAIL (and PLAY_INVITE_URL if you have it) below.
 *   4. In the function dropdown at the top, choose "setupEverything",
 *      then click Run.
 *   5. Google will prompt you to authorize (needs permission to create
 *      Forms/Sheets and send email). Review permissions → your account →
 *      Advanced → "Go to (project name) (unsafe)" → Allow. This warning
 *      is normal/expected for your own personal scripts.
 *   6. Open the Execution log (View → Executions, or the log panel).
 *      It prints the Form's public URL and the Form's edit URL — copy
 *      the public one.
 *   7. Update android-beta.html on the site: replace the placeholder
 *      https://forms.gle/REPLACE_WITH_YOUR_FORM_ID with that public URL
 *      (send it to me and I'll do this + push it for you).
 *
 * That's it — the trigger is already installed by step 4, so every
 * future submission is handled automatically. You never need to touch
 * Google Forms' own editor UI at all.
 *
 * SENDING THE PLAY INVITE (repeat whenever new people sign up):
 *   1. Run "exportEmailListForPlayConsole" and copy the block it logs.
 *   2. Paste it into Play Console → Testing → your test → Testers, and
 *      save. Play does NOT email anyone at this point.
 *   3. Run "sendPendingInvites". It emails the opt-in link to everyone
 *      who has not been invited yet and stamps the "Invited at" column,
 *      so running it again later only mails the new sign-ups.
 *
 * Nothing here needs a server, API key or paid Google Workspace account —
 * it runs entirely inside your own free Google account.
 */

// ---- Configure these two lines ----
const OWNER_EMAIL = 'saytapph@gmail.com'; // where sign-up notifications go
const PLAY_INVITE_URL = 'https://play.google.com/apps/internaltest/4700937284727720274'; // Play Console opt-in link
// ------------------------------------

const SHEET_NAME = 'Testers';
const EMAIL_QUESTION_TITLE = 'Email'; // must match the form question's title exactly
const FORM_TITLE = 'Sayt — Android Beta Sign-up';

/**
 * Run this once. Creates the Form + linked Sheet + trigger, all wired
 * together, and logs the URLs you need.
 */
function setupEverything() {
  // Avoid creating duplicates if this is accidentally run twice.
  const props = PropertiesService.getScriptProperties();
  const existingFormId = props.getProperty('FORM_ID');
  if (existingFormId) {
    try {
      const existingForm = FormApp.openById(existingFormId);
      Logger.log('A form was already created by this script. Reusing it.');
      Logger.log('Public URL (put this on the site): ' + existingForm.getPublishedUrl());
      Logger.log('Edit URL (for you): ' + existingForm.getEditUrl());
      return;
    } catch (err) {
      // Fall through and create a new one if the old one is gone.
    }
  }

  const form = FormApp.create(FORM_TITLE);
  form.setDescription(
    "Sign up to test Sayt on Android. Leave your email and you'll get a Google " +
    "Play invite link as soon as a build is ready."
  );
  form.setCollectEmail(false); // we ask for it ourselves as a normal question below
  form
    .addTextItem()
    .setTitle(EMAIL_QUESTION_TITLE)
    .setRequired(true);

  // Link a response spreadsheet so the script has somewhere to read/write.
  const ss = SpreadsheetApp.create(FORM_TITLE + ' — Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  getOrCreateTestersSheet_(ss); // pre-create the Testers tab

  // Install the on-submit trigger programmatically — no manual "Add Trigger" click needed.
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  props.setProperty('FORM_ID', form.getId());
  props.setProperty('SHEET_ID', ss.getId());

  Logger.log('Done. Form + Sheet + trigger created.');
  Logger.log('Public URL (put this on the site): ' + form.getPublishedUrl());
  Logger.log('Edit URL (for you, to view/tweak the question): ' + form.getEditUrl());
  Logger.log('Responses spreadsheet: ' + ss.getUrl());
}

function onFormSubmit(e) {
  if (!e) {
    Logger.log('No form submission data found. Creating the Form now instead.');
    setupEverything();
    return;
  }

  const email = extractEmail_(e);
  if (!email || !isValidEmail_(email)) {
    return; // ignore junk or missing submissions silently
  }

  const sheet = getOrCreateTestersSheet_();
  if (alreadyExists_(sheet, email)) {
    return; // don't re-notify or duplicate on repeat sign-ups
  }

  sheet.appendRow([new Date(), email, '']);
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

function getOrCreateTestersSheet_(ssParam) {
  // Prefer an explicitly-passed spreadsheet (setupEverything, right after
  // creating it). Otherwise the trigger runs bound to the FORM, not the
  // sheet, so we look the sheet up by the ID we stashed at setup time.
  const ss = ssParam || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Signed up at', 'Email', 'Invited at']);
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
    "Your email is on the list. Once it has been added on the Google Play " +
    "side, you'll get a second email with the link that lets you install " +
    "Sayt from Play.\n\n" +
    "One thing that matters: use the same Google account on your phone that " +
    "you signed up with, otherwise Play will not show you the test.\n\n" +
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
 * Emails the Google Play opt-in link to everyone on the list who has not
 * been invited yet, then stamps the "Invited at" column so nobody is
 * mailed twice.
 *
 * Use it like this:
 *   1. In Play Console, open your active test and add the tester emails
 *      (run exportEmailListForPlayConsole below to get them in one block).
 *   2. Copy the opt-in link Play gives you into PLAY_INVITE_URL at the
 *      top of this file, and save.
 *   3. Select "sendPendingInvites" in the function dropdown and click Run.
 *
 * Safe to run again later — it only mails people added since last time,
 * so new sign-ups get the link without you tracking who is new.
 *
 * Note: a free Gmail account can send about 100 emails a day. If the list
 * is longer than the remaining quota, this stops cleanly and tells you how
 * many are left; just run it again tomorrow.
 */
function sendPendingInvites() {
  if (PLAY_INVITE_URL.indexOf('YOUR_PACKAGE_ID') !== -1) {
    Logger.log('Set PLAY_INVITE_URL at the top of this file first, then run this again.');
    return;
  }

  const sheet = getOrCreateTestersSheet_();
  if (String(sheet.getRange(1, 3).getValue()).trim() === '') {
    sheet.getRange(1, 3).setValue('Invited at'); // sheets made before this column existed
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No testers on the list yet.');
    return;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  let sent = 0;
  let skipped = 0;
  let remainingAfterQuota = 0;

  for (let i = 0; i < rows.length; i++) {
    const email = String(rows[i][1]).trim();
    const alreadyInvited = String(rows[i][2]).trim() !== '';

    if (!email || !isValidEmail_(email) || alreadyInvited) {
      skipped++;
      continue;
    }

    if (MailApp.getRemainingDailyQuota() < 1) {
      remainingAfterQuota++;
      continue;
    }

    MailApp.sendEmail(
      email,
      'Your Sayt Android beta invite',
      "Sayt for Android is ready for you to test.\n\n" +
      "Open this link on your Android phone, tap to become a tester, then " +
      "install Sayt from Google Play:\n" + PLAY_INVITE_URL + "\n\n" +
      "Use the same Google account on the phone that you signed up with, " +
      "otherwise Play will not show you the test.\n\n" +
      "It can take a few minutes after joining before the Play listing " +
      "appears. If anything looks wrong, just reply to this email."
    );

    sheet.getRange(i + 2, 3).setValue(new Date());
    sent++;
  }

  Logger.log('Invites sent: ' + sent);
  Logger.log('Skipped (already invited or blank): ' + skipped);
  if (remainingAfterQuota > 0) {
    Logger.log('Hit the daily send limit. Still waiting: ' + remainingAfterQuota + '. Run this again tomorrow.');
  }
}

/**
 * Optional helper — run manually any time from the script editor to get a
 * newline-separated list of every tester email, ready to paste straight
 * into Play Console → Testing → your active test → Testers list.
 * Output appears in View → Logs (or Execution log).
 */
function exportEmailListForPlayConsole() {
  const sheet = getOrCreateTestersSheet_();
  const values = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  const emails = values.map(row => row[0]).filter(String);
  Logger.log(emails.join('\n'));
}
