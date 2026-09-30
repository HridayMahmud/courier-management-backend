// Brevo HTTP transport, checked against a local fake Brevo server (no real email is sent).
const http = require('http');
const { execFile } = require('child_process');
const path = require('path');
const { check, done } = require('./lib');

// run a small script with its own env, because config/mail.js reads the env once when loaded.
// Empty values keep a local .env from leaking in (dotenv never overrides existing keys).
// Async on purpose: the fake Brevo server lives in this process and must keep answering.
const BLANK = { MAIL_TRANSPORT: '', EMAIL_USER: '', EMAIL_PASS: '', EMAIL_FROM: '', BREVO_API_KEY: '', BREVO_API_URL: '', MAIL_TIMEOUT_MS: '' };
function sendWith(env, script) {
  return new Promise((resolve) => {
    execFile(process.execPath, ['-e', script], { cwd: path.join(__dirname, '..'), env: { ...process.env, ...BLANK, ...env }, timeout: 20000 }, (_err, stdout, stderr) =>
      resolve(String(stdout) + String(stderr)),
    );
  });
}

const SEND = `require('./config/mail.js').sendMail({ to: 'receiver@test.com', subject: 'Hello', html: '<p>Code <b>123</b></p>' })
  .then(() => console.log('SENT')).catch((e) => console.log('FAILED ' + e.message));`;

(async () => {
  console.log('Mail: Brevo HTTP transport');
  let received = null;
  let mode = 'ok';
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received = { method: req.method, apiKey: req.headers['api-key'], body: JSON.parse(body || '{}') };
      if (mode === 'hang') return; // never answer
      if (mode === 'error') {
        res.writeHead(401, { 'content-type': 'application/json' });
        return res.end('{"message":"Key not found"}');
      }
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end('{"messageId":"<test@brevo>"}');
    });
  });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/v3/smtp/email`;
  const brevo = { BREVO_API_KEY: 'test-key', BREVO_API_URL: url, EMAIL_FROM: 'SwiftShip <sender@test.com>' };

  let out = await sendWith(brevo, SEND);
  check('BREVO_API_KEY alone selects brevo and sends', out.includes('SENT'), out);
  check('api-key header sent', received?.apiKey === 'test-key', received);
  check('sender parsed from EMAIL_FROM', received?.body.sender?.email === 'sender@test.com' && received?.body.sender?.name === 'SwiftShip', received?.body);
  check('receiver, subject, html and text passed', received?.body.to?.[0]?.email === 'receiver@test.com' && received.body.subject === 'Hello' && received.body.htmlContent.includes('123') && received.body.textContent === 'Code 123', received?.body);

  mode = 'error';
  out = await sendWith(brevo, SEND);
  check('Brevo error status becomes a clear error', /FAILED Brevo responded 401/.test(out), out);

  mode = 'hang';
  const started = Date.now();
  out = await sendWith({ ...brevo, MAIL_TIMEOUT_MS: '800' }, SEND);
  check('hanging mail service times out quickly', /FAILED/.test(out) && Date.now() - started < 10000, [out, Date.now() - started]);

  out = await sendWith({}, `console.log('transport=' + require('./config/mail.js').transport)`);
  check('without any mail settings the transport is console', out.includes('transport=console'), out);

  server.close();
  await done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
