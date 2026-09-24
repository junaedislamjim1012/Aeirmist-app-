import * as ftp from 'basic-ftp';
import fs from 'fs';

async function test() {
  const client = new ftp.Client();
  await client.access({
    host: 'ftpupload.net',
    user: 'if0_42922540',
    password: 'aeirmist1012',
    secure: false
  });
  console.log('Connected to FTP');
  const phpCode = '<?php echo "PHP_OK_" . (function_exists("curl_init") ? "CURL_YES" : "CURL_NO"); ?>';
  fs.writeFileSync('temp_test.php', phpCode);
  await client.cd('htdocs');
  try { await client.send('MKD api'); } catch(e){}
  await client.uploadFrom('temp_test.php', 'api/test.php');
  fs.unlinkSync('temp_test.php');
  client.close();
  console.log('Uploaded api/test.php');
}
test().catch(console.error);
