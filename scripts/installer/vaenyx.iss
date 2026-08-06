; Vaenyx GUI installer (Inno Setup 6, free).
;
; What it does, in the user's language (English or Simplified Chinese):
;   1. Asks where to install (default C:\Vaenyx) and refuses cloud-synced or
;      over-long locations with the same plain-language explanations
;      scripts/Vaenyx-Setup.ps1 gives - the checks are ported from
;      Get-InstallPathWarning there and must stay in step with it.
;   2. Copies the tracked source tree (staged by Vaenyx-Stage-Payload.ps1 -
;      the exact same payload the zip download carries).
;   3. Runs the existing PowerShell setup (scripts/Vaenyx-Setup.ps1) in a
;      visible console: Node.js via winget with the official-MSI fallback,
;      npm ci, build, the userdata ACL lock, autostart registration, and the
;      direct first start. The installer is already elevated, so none of those
;      steps raises a second UAC prompt.
;   4. Finishes with "Vaenyx is running", an Open Vaenyx checkbox, and a note
;      that the desktop icon exists.
;
; Upgrades: same AppId + UsePreviousAppDir means a reinstall lands in the same
; folder. userdata\ and private\ are never in [Files], so user data, logs and
; sign-ins survive every reinstall untouched; the setup rerun re-locks the
; userdata ACL with the children-only /reset rule.
;
; Uninstall: appears in Add/Remove Programs, stops the server, removes the
; autostart task, and ASKS whether to keep userdata - keeping it is the
; default.
;
; Compile with scripts/installer/Vaenyx-Build-Installer.ps1, which stages the
; payload and passes the defines below. The exe is intentionally unsigned
; (no paid certificate); the website and Read-Me-First.txt walk users through
; the SmartScreen "More info -> Run anyway" step.
#ifndef AppVersion
  #error Run scripts/installer/Vaenyx-Build-Installer.ps1 instead of compiling this file directly (it stages the payload and passes /DAppVersion)
#endif
#ifndef AppNumericVersion
  #error Missing /DAppNumericVersion (x.y.z, no suffix) - use Vaenyx-Build-Installer.ps1
#endif
#ifndef PayloadDir
  #error Missing /DPayloadDir - use Vaenyx-Build-Installer.ps1
#endif

[Setup]
; Never change this AppId: it is how Windows knows a later vaenyx-setup.exe is
; an upgrade of THIS install rather than a second program.
AppId={{19467537-246D-4970-9F8B-C6C03E2904D7}
AppName=Vaenyx
AppVersion={#AppVersion}
AppVerName=Vaenyx {#AppVersion}
AppPublisher=Vaenyx
AppPublisherURL=https://vaenyx.ai
AppSupportURL=https://github.com/vaenyxai/core
VersionInfoVersion={#AppNumericVersion}
; SignPath's signing validates binary metadata: the product NAME is always
; plain "Vaenyx", and the product VERSION is the same release number the app,
; the zip and this installer all read from apps/server/src/config.ts — one
; source, never a hand-written second copy.
VersionInfoProductName=Vaenyx
VersionInfoProductVersion={#AppVersion}
; Short path on the system drive, outside Program Files: setup builds the app
; in place with npm and keeps the live database under the same folder, and
; C:\Vaenyx dodges the cloud-sync, path-length and spaces traps the path
; checks below exist for.
DefaultDirName={sd}\Vaenyx
UsePreviousAppDir=yes
DirExistsWarning=no
DisableProgramGroupPage=yes
; Language -> install folder -> install -> finished. No ready page: the only
; decision is the folder, and the button on that page already says Install.
DisableReadyPage=yes
; Elevate once here; every later step (winget, schtasks, the ACL lock) rides
; on this single UAC approval.
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
OutputBaseFilename=vaenyx-setup
OutputDir=..\..\release
SetupIconFile=vaenyx.ico
UninstallDisplayName=Vaenyx
UninstallDisplayIcon={app}\vaenyx.ico
WizardStyle=modern
SetupMutex=VaenyxSetupMutex
Compression=lzma2/max
SolidCompression=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
; Simplified Chinese is the official translation from the Inno Setup source
; repository (jrsoftware/issrc, Files/Languages/Unofficial), vendored next to
; this script because the installed compiler does not ship it.
Name: "chinesesimplified"; MessagesFile: "ChineseSimplified.isl"

[Files]
Source: "{#PayloadDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "vaenyx.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Both icons do exactly what the desktop shortcut promises: run
; Vaenyx-Start.cmd in a visible window - clear the stop sentinel, start the
; server if nothing answers, open the browser at localhost:3000. One
; behaviour, one launcher, nothing hidden.
Name: "{commondesktop}\Vaenyx"; Filename: "{app}\Vaenyx-Start.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\vaenyx.ico"; Comment: "{cm:ShortcutComment}"
Name: "{commonprograms}\Vaenyx"; Filename: "{app}\Vaenyx-Start.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\vaenyx.ico"; Comment: "{cm:ShortcutComment}"

[Run]
; The finish-page checkbox, checked by default. Vaenyx is already running at
; this point (the setup step started it), so Vaenyx-Start just opens the
; browser - same behaviour as the desktop icon, on purpose.
Filename: "{app}\Vaenyx-Start.cmd"; Description: "{cm:OpenVaenyx}"; Flags: postinstall nowait shellexec skipifsilent; Check: SetupStepSucceeded

[CustomMessages]
english.ShortcutComment=Open Vaenyx (starts it first if it is not running)
chinesesimplified.ShortcutComment=打开 Vaenyx(未运行时会先启动)
english.OpenVaenyx=Open Vaenyx in the browser
chinesesimplified.OpenVaenyx=在浏览器中打开 Vaenyx
english.PathCloud=This folder is inside a cloud-synced drive (OneDrive/Dropbox/Google Drive).%nVaenyx keeps a live database here; cloud sync will corrupt it.%nPlease choose somewhere like C:\Vaenyx instead.
chinesesimplified.PathCloud=这个文件夹在云同步盘里(OneDrive/Dropbox/Google Drive)。%nVaenyx 会在这里放一个正在使用的数据库,云同步会把它弄坏。%n请改选 C:\Vaenyx 这类位置。
english.PathTooLong=This folder path is very long, which breaks the install on Windows.%nPlease choose somewhere short, like C:\Vaenyx.
chinesesimplified.PathTooLong=这个路径太长,Windows 上会导致安装失败。%n请改选短一点的位置,比如 C:\Vaenyx。
english.PathSpaces=This folder path contains spaces. It usually works, but C:\Vaenyx is safer.%n%nUse this location anyway?
chinesesimplified.PathSpaces=路径里有空格。通常没问题,但放在 C:\Vaenyx 更稳妥。%n%n仍然使用这个位置吗?
english.PreparingVaenyx=Preparing Vaenyx - downloading components and building. A window shows each step; this can take a few minutes...
chinesesimplified.PreparingVaenyx=正在准备 Vaenyx —— 下载组件并构建。会有窗口显示每一步,可能需要几分钟...
english.SetupFailed=The preparing step did not finish. Nothing is broken: the window that just closed said what to fix (usually the internet connection).%n%nFix it, then double-click Vaenyx-Setup.cmd in %1 to finish the install. The full log is at %2.
chinesesimplified.SetupFailed=准备步骤没有完成。不用担心:刚才的窗口里写明了要修什么(通常是网络问题)。%n%n修好后,双击 %1 里的 Vaenyx-Setup.cmd 即可完成安装。完整日志在 %2。
english.FinishedRunning=Vaenyx is installed and running.%n%nA Vaenyx icon is on your desktop - double-click it any time to open Vaenyx.
chinesesimplified.FinishedRunning=Vaenyx 已安装并正在运行。%n%n桌面上有一个 Vaenyx 图标 —— 随时双击即可打开 Vaenyx。
english.FinishedFailed=Vaenyx was copied, but the preparing step did not finish.%n%nFix what the setup window said (usually the internet connection), then double-click Vaenyx-Setup.cmd in the install folder to finish. A Vaenyx icon is on your desktop for afterwards.
chinesesimplified.FinishedFailed=Vaenyx 已复制完成,但准备步骤没有完成。%n%n按照安装窗口里的提示修复(通常是网络问题),然后双击安装文件夹里的 Vaenyx-Setup.cmd 完成安装。桌面上已放好 Vaenyx 图标,供之后使用。
english.KeepDataQuestion=Keep your Vaenyx data?%n%nYES keeps your chats, settings, backups and sign-ins in %1, so installing Vaenyx there again later brings everything back.%n%nNO deletes all of it for good.
chinesesimplified.KeepDataQuestion=保留你的 Vaenyx 数据吗?%n%n「是」会把聊天、设置、备份和登录信息保留在 %1,以后再装 Vaenyx 一切照旧。%n%n「否」会把这些数据永久删除。
english.DataKept=Your data is still at %1.%nInstall Vaenyx into the same folder any time to keep using it. Deleting that folder later removes the data for good.
chinesesimplified.DataKept=你的数据仍保存在 %1。%n以后把 Vaenyx 装回同一文件夹即可继续使用。之后删除该文件夹会永久删除这些数据。

[Code]
var
  // Set by the post-install setup run; the finish page and the Open Vaenyx
  // checkbox read it, so a failed preparation never pretends to have worked.
  SetupRanClean: Boolean;

function SetupStepSucceeded(): Boolean;
begin
  Result := SetupRanClean;
end;

// Ported from Get-InstallPathWarning in scripts/Vaenyx-Setup.ps1 - the two
// scripts must refuse the same locations for the same reasons. A trailing
// backslash is appended so the last path segment is matched exactly too.
function PathIsCloudSynced(const Path: String): Boolean;
var
  Normalised: String;
begin
  Normalised := '\' + Lowercase(Path) + '\';
  StringChangeEx(Normalised, '/', '\', True);
  Result := (Pos('\onedrive\', Normalised) > 0)
    or (Pos('\dropbox\', Normalised) > 0)
    or (Pos('\google drive\', Normalised) > 0)
    or (Pos('\googledrive\', Normalised) > 0)
    or (Pos('\iclouddrive\', Normalised) > 0);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  Dir: String;
begin
  Result := True;
  if CurPageID = wpSelectDir then begin
    Dir := WizardForm.DirEdit.Text;
    if PathIsCloudSynced(Dir) then begin
      SuppressibleMsgBox(CustomMessage('PathCloud'), mbError, MB_OK, IDOK);
      Result := False;
    end else if Length(Dir) > 120 then begin
      SuppressibleMsgBox(CustomMessage('PathTooLong'), mbError, MB_OK, IDOK);
      Result := False;
    end else if Pos(' ', Dir) > 0 then begin
      // Spaces are a warning, not a refusal - same as the PowerShell setup.
      Result := SuppressibleMsgBox(CustomMessage('PathSpaces'), mbConfirmation,
        MB_YESNO, IDYES) = IDYES;
    end;
  end;
end;

// On an upgrade, stop the running server BEFORE its files are overwritten.
// Vaenyx-Stop.ps1 also writes the stay-stopped sentinel, which keeps the
// SYSTEM watchdog from starting a half-upgraded build while npm is still
// working; the sentinel is cleared again after the setup step succeeds.
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  StopScript: String;
  ResultCode: Integer;
begin
  Result := '';
  StopScript := ExpandConstant('{app}\scripts\Vaenyx-Stop.ps1');
  if FileExists(StopScript) then begin
    Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
      '-NoProfile -ExecutionPolicy Bypass -File "' + StopScript + '"',
      ExpandConstant('{app}'), SW_SHOW, ewWaitUntilTerminated, ResultCode);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  LangCode: String;
  Params: String;
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then begin
    WizardForm.StatusLabel.Caption := CustomMessage('PreparingVaenyx');
    if ActiveLanguage = 'chinesesimplified' then
      LangCode := 'zh'
    else
      LangCode := 'en';
    // The whole existing setup, reused as-is: Node.js (winget, then the
    // official MSI), npm ci, build, the userdata ACL lock, autostart
    // registration (register only - the first start is the direct one, per
    // the watchdog design), and the direct server start. -Language also
    // writes userdata\config\language.json exactly the way setup always has.
    // -NoBrowser because opening the app is the finish page's checkbox.
    // The console stays visible on purpose: the user watches real steps in
    // their own language instead of trusting a silent progress bar.
    Params := '-NoProfile -ExecutionPolicy Bypass -File "'
      + ExpandConstant('{app}\scripts\Vaenyx-Setup.ps1')
      + '" -Language ' + LangCode + ' -NoBrowser';
    if Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
        Params, ExpandConstant('{app}'), SW_SHOW, ewWaitUntilTerminated,
        ResultCode) and (ResultCode = 0) then begin
      SetupRanClean := True;
      // Clear the stay-stopped sentinel the upgrade stop wrote, so the boot
      // watchdog resumes its job. Deleted only on success: while anything is
      // unfinished the sentinel keeps the watchdog away from a stale build.
      DeleteFile(ExpandConstant('{app}\userdata\db\autostart-paused.flag'));
    end else begin
      SetupRanClean := False;
      // Note: a continuation line must never START with '[' - the .iss section
      // parser would read it as a section tag, even here inside [Code].
      SuppressibleMsgBox(
        FmtMessage(CustomMessage('SetupFailed'), [ExpandConstant('{app}'),
          ExpandConstant('{app}\userdata\logs\setup.log')]),
        mbError, MB_OK, IDOK);
    end;
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  // The stock finish text says "completed"; ours says what actually happened.
  if CurPageID = wpFinished then begin
    if SetupRanClean then
      WizardForm.FinishedLabel.Caption := CustomMessage('FinishedRunning')
    else
      WizardForm.FinishedLabel.Caption := CustomMessage('FinishedFailed');
  end;
end;

// ---- Uninstall ----

var
  // Answered once at the start of uninstall, acted on after the app files are
  // gone. Defaults to keeping the data.
  DeleteUserData: Boolean;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
  StopScript: String;
begin
  if CurUninstallStep = usUninstall then begin
    // Ask about the data first, while nothing has been touched. YES (keep) is
    // the default button.
    DeleteUserData := SuppressibleMsgBox(
      FmtMessage(CustomMessage('KeepDataQuestion'), [ExpandConstant('{app}\userdata')]),
      mbConfirmation, MB_YESNO or MB_DEFBUTTON1, IDYES) = IDNO;
    // Remove the boot task, then stop the running server the same way the
    // Stop button does. Both are best-effort: a half-registered task must not
    // block an uninstall.
    Exec(ExpandConstant('{sys}\schtasks.exe'), '/End /TN "VaenyxAutostart"',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec(ExpandConstant('{sys}\schtasks.exe'), '/Delete /TN "VaenyxAutostart" /F',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    StopScript := ExpandConstant('{app}\scripts\Vaenyx-Stop.ps1');
    if FileExists(StopScript) then begin
      Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
        '-NoProfile -ExecutionPolicy Bypass -File "' + StopScript + '"',
        ExpandConstant('{app}'), SW_SHOW, ewWaitUntilTerminated, ResultCode);
    end;
  end;
  if CurUninstallStep = usPostUninstall then begin
    // The uninstaller removed what it installed; what remains under {app} is
    // what setup built or the app wrote. Derived build output goes either
    // way; the personal folders (userdata\, and private\ with the sign-in
    // secrets) follow the user's choice.
    DelTree(ExpandConstant('{app}\node_modules'), True, True, True);
    DelTree(ExpandConstant('{app}\apps'), True, True, True);
    DelTree(ExpandConstant('{app}\packages'), True, True, True);
    if DeleteUserData then begin
      DelTree(ExpandConstant('{app}\userdata'), True, True, True);
      DelTree(ExpandConstant('{app}\private'), True, True, True);
      RemoveDir(ExpandConstant('{app}'));
    end else begin
      SuppressibleMsgBox(
        FmtMessage(CustomMessage('DataKept'), [ExpandConstant('{app}\userdata')]),
        mbInformation, MB_OK, IDOK);
    end;
  end;
end;
