# Meet Maestro Sync Bridge

## Publisher Identity & Code Signing
To avoid SmartScreen "Unrecognized Publisher" warnings on Windows, this executable should be digitally signed.

Currently, the `package.json` embeds `Michael McFadden` as the Author, which will appear in the "Details" tab of the `.exe` properties. However, a cryptographic signature is still required to bypass Defender warnings.

### Signing Instructions (For Production)
If you purchase a Code Signing Certificate (e.g. from DigiCert or Sectigo), you must sign the resulting `.exe` after running `npm run build`.

1. Install the Windows SDK to obtain `signtool.exe`.
2. Locate your certificate (`.pfx` or `.p12`) and password.
3. Run the following command in PowerShell:

```powershell
signtool sign /f "C:\path\to\your\cert.pfx" /p "yourpassword" /tr http://timestamp.digicert.com /td sha256 /fd sha256 maestro-sync.exe
```

### Self-Signing for Testing
To self-sign for testing (this will only bypass warnings on *your* machine if you install the root cert):

1. Generate a certificate:
```powershell
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Michael McFadden"
```
2. Export the certificate to `.pfx`.
3. Sign using `signtool.exe` as described above.
