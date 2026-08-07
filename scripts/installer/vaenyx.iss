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
; source, never a hand-written second copy. The numeric slot only accepts
; x.y.z digits (a -dev suffix makes the compile itself fail), so the suffix
; lives in the TEXT slot — which is also the string Explorer and SignPath
; display as ProductVersion.
VersionInfoProductName=Vaenyx
VersionInfoProductVersion={#AppNumericVersion}
VersionInfoProductTextVersion={#AppVersion}
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
; Room for the component ticks to share the install-location page. Measured:
; at 120% the page is 861x515 and everything ends at 451, so 64px spare.
WizardSizePercent=120
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
english.PickTitle=Choose what to download
chinesesimplified.PickTitle=选择要下载的组件
english.PickTotal=Will download about %1 MB
chinesesimplified.PickTotal=将下载约 %1 MB
english.PickTail=Use Vaenyx on my phone (Tailscale)   +37 MB
chinesesimplified.PickTail=在手机上用 Vaenyx(Tailscale)   +37 MB
english.PickTailNote=Installs Tailscale so your phone reaches this computer from any network. You sign in to your own free Tailscale account in the next screen - installing it is not the same as being connected.
chinesesimplified.PickTailNote=装上 Tailscale,手机在任何网络下都能安全连回这台电脑。下一步会用你自己的免费 Tailscale 账号登录一次 —— 装上不等于已经连通。
english.PickCodex=Use my ChatGPT subscription   +248 MB
chinesesimplified.PickCodex=用我的 ChatGPT 订阅   +248 MB
english.PickCodexNote=Only useful if you already pay for ChatGPT Plus or Pro. Leave it off and Vaenyx downloads it the first time you connect.
chinesesimplified.PickCodexNote=只有你已经在付 ChatGPT Plus / Pro 才用得上。不勾也行 —— 以后第一次连接时会自动下载。
english.PickClaude=Use my Claude subscription   +297 MB
chinesesimplified.PickClaude=用我的 Claude 订阅   +297 MB
english.PickClaudeNote=Only useful if you already pay for Claude Pro or Max. Leave it off and Vaenyx downloads it the first time you connect.
chinesesimplified.PickClaudeNote=只有你已经在付 Claude Pro / Max 才用得上。不勾也行 —— 以后第一次连接时会自动下载。
english.PickVoiceZh=Offline Chinese voice   +60 MB
chinesesimplified.PickVoiceZh=中文离线语音   +60 MB
english.PickVoiceEn=Offline English voice   +60 MB
chinesesimplified.PickVoiceEn=英文离线语音   +60 MB
english.PickVoiceNote=Lets Vaenyx speak without the internet. Without them, reading aloud goes through the model you connect. The speech engine (21 MB) is shared, so a second language adds only 60 MB.
chinesesimplified.PickVoiceNote=让 Vaenyx 不联网也能说话。不装的话,朗读走你连接的云端模型。语音引擎(21 MB)两种语言共用,所以加第二种语言只多 60 MB。
english.PickInstalled=already installed
chinesesimplified.PickInstalled=已安装
english.NoRoom=There is not enough free space on drive %1.%n%nVaenyx needs about %2 MB there and %3 MB is free.%n%nFree some space, or choose a folder on another drive.
chinesesimplified.NoRoom=%1 盘的可用空间不够。%n%nVaenyx 大约需要 %2 MB,该盘只剩 %3 MB。%n%n请清出一些空间,或把安装位置改到别的盘。
english.NoRoomCache=Windows needs room on drive %1 to unpack the downloads, even though Vaenyx is installed elsewhere.%n%nAbout %2 MB is needed there and %3 MB is free.
chinesesimplified.NoRoomCache=即使 Vaenyx 装在别的盘,Windows 仍需要 %1 盘的空间来解包下载的组件。%n%n该盘大约需要 %2 MB,现在只剩 %3 MB。
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

// ---- What to download (the install-location page's upper half) ----
//
// It shares that page rather than having one of its own: measured, five ticks
// with a line of explanation each end 64px above where the page runs out, so
// a second page would only be a second Next to press.
//
// The total is COMPUTED HERE and not by Inno. Inno's own component sizes count
// files packed INTO the installer; every one of these is fetched afterwards,
// so its numbers would all read zero. Sizes are measured, not estimated
// (2026-08-07): codex 247 MB on disk, the Claude component 297 MB, the
// Tailscale MSI 36.6 MB, the speech engine 21.4 MB and each voice 60.3 MB.
var
  CbCodex, CbClaude, CbTail, CbVoiceZh, CbVoiceEn: TCheckBox;
  TotalLabel: TLabel;

function ComponentMb(Box: TCheckBox; Size: Integer): Integer;
begin
  if Box.Checked and Box.Enabled then Result := Size else Result := 0;
end;

// Megabytes that will come down the wire for the current ticks.
function DownloadMb(): Integer;
begin
  Result := ComponentMb(CbCodex, 247) + ComponentMb(CbClaude, 297)
    + ComponentMb(CbTail, 37)
    + ComponentMb(CbVoiceZh, 60) + ComponentMb(CbVoiceEn, 60);
  // The speech engine is shared by both voices, so it is counted ONCE and
  // never twice - which is why ticking a second language adds 60 and not 81.
  if (CbVoiceZh.Checked and CbVoiceZh.Enabled)
    or (CbVoiceEn.Checked and CbVoiceEn.Enabled) then
    Result := Result + 21;
end;

procedure UpdateTotal(Sender: TObject);
begin
  TotalLabel.Caption := FmtMessage(CustomMessage('PickTotal'), [
    IntToStr(DownloadMb())]);
end;

// The comma-separated list handed to Vaenyx-Setup.ps1. Nothing is downloaded
// by this installer: the list is written into userdata and Vaenyx fetches each
// one on its first boot, where the code for every one of them already lives
// and where a failure can be a sentence instead of a broken install.
function ChosenComponents(): String;
begin
  Result := '';
  if CbCodex.Checked and CbCodex.Enabled then Result := Result + ',codex';
  if CbClaude.Checked and CbClaude.Enabled then Result := Result + ',claude';
  if CbTail.Checked and CbTail.Enabled then Result := Result + ',tailscale';
  if CbVoiceZh.Checked and CbVoiceZh.Enabled then Result := Result + ',voice-zh';
  if CbVoiceEn.Checked and CbVoiceEn.Enabled then Result := Result + ',voice-en';
  Delete(Result, 1, 1);
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

function MakeComponentBox(Top: Integer; Caption, Note: String): TCheckBox;
var
  NoteLabel: TLabel;
begin
  Result := TCheckBox.Create(WizardForm);
  Result.Parent := WizardForm.SelectDirPage;
  Result.Left := 0;
  Result.Top := Top;
  Result.Width := WizardForm.SelectDirPage.Width;
  Result.Height := ScaleY(17);
  Result.Caption := Caption;
  Result.OnClick := @UpdateTotal;

  NoteLabel := TLabel.Create(WizardForm);
  NoteLabel.Parent := WizardForm.SelectDirPage;
  NoteLabel.Left := ScaleX(18);
  NoteLabel.Top := Top + ScaleY(16);
  NoteLabel.Width := WizardForm.SelectDirPage.Width - ScaleX(18);
  NoteLabel.Caption := Note;
  NoteLabel.Font.Color := clGrayText;
  NoteLabel.WordWrap := False;
end;

procedure InitializeWizard;
var
  Y, Step: Integer;
begin
  TotalLabel := TLabel.Create(WizardForm);
  TotalLabel.Parent := WizardForm.SelectDirPage;
  TotalLabel.Left := 0;
  TotalLabel.Top := 0;
  TotalLabel.Width := WizardForm.SelectDirPage.Width;
  TotalLabel.Font.Style := [fsBold];

  Y := ScaleY(22);
  Step := ScaleY(32);
  // Tailscale first and ON by default: using Vaenyx from a phone is one of the
  // things it is FOR, it is the smallest of the five, and it is the only one
  // that is a capability rather than support for one particular provider. The
  // two subscriptions are OFF by default for the opposite reason - they are
  // 250 MB each and are of use only to somebody already paying for that
  // service, so leaving one off costs that person a single download later,
  // while ticking them by default would cost everybody else half a gigabyte.
  CbTail := MakeComponentBox(Y, CustomMessage('PickTail'),
    CustomMessage('PickTailNote'));
  Y := Y + Step;
  CbCodex := MakeComponentBox(Y, CustomMessage('PickCodex'),
    CustomMessage('PickCodexNote'));
  Y := Y + Step;
  CbClaude := MakeComponentBox(Y, CustomMessage('PickClaude'),
    CustomMessage('PickClaudeNote'));
  Y := Y + Step;
  // The two voices are one idea in two ticks, so they sit together with a
  // single note under the pair.
  CbVoiceZh := MakeComponentBox(Y, CustomMessage('PickVoiceZh'), '');
  Y := Y + ScaleY(18);
  CbVoiceEn := MakeComponentBox(Y, CustomMessage('PickVoiceEn'),
    CustomMessage('PickVoiceNote'));
  Y := Y + Step + ScaleY(8);

  // ⚠ TICKED ONLY NOW, once all five exist. Setting Checked fires OnClick,
  // OnClick totals every box, and a box that has not been created yet is nil —
  // doing this beside CbTail's creation crashed the whole installer before it
  // drew a single page ("Could not call proc", caught in rehearsal).
  CbTail.Checked := True;

  // The stock install-location controls move below the ticks.
  WizardForm.SelectDirLabel.Top := Y;
  WizardForm.SelectDirBrowseLabel.Top := Y + ScaleY(18);
  WizardForm.DirEdit.Top := Y + ScaleY(40);
  WizardForm.DirBrowseButton.Top := Y + ScaleY(38);
  WizardForm.DiskSpaceLabel.Top := Y + ScaleY(70);
  UpdateTotal(nil);
end;

// An upgrade must not offer to download what this instance already has. Read
// it off the disk, never off a stored answer: the folder is the truth, and a
// userdata folder restored from a backup brings its components with it.
procedure MarkOne(Box: TCheckBox; const Path: String);
begin
  if DirExists(Path) or FileExists(Path) then begin
    Box.Checked := False;
    Box.Enabled := False;
    Box.Caption := Box.Caption + '   (' + CustomMessage('PickInstalled') + ')';
  end;
end;

procedure MarkAlreadyInstalled(const Dir: String);
begin
  MarkOne(CbCodex, Dir + '\userdata\tools\node_modules\@openai\codex');
  MarkOne(CbClaude, Dir + '\userdata\tools\node_modules\@anthropic-ai\claude-agent-sdk');
  MarkOne(CbVoiceZh, Dir + '\userdata\tts\voices\zh_CN-chaowen-medium.onnx');
  MarkOne(CbVoiceEn, Dir + '\userdata\tts\voices\en_US-amy-medium.onnx');
  UpdateTotal(nil);
end;

// SPACE IS CHECKED ON TWO DRIVES, not one. The components are unpacked through
// npm and Windows temp, which live under the user profile - so a Vaenyx
// installed on D: can still fail for want of room on C:. And the space needed
// is not the download size: an npm install holds the archive and the unpacked
// copy at the same time, so the peak is roughly half again.
function DriveOf(const Path: String): String;
begin
  Result := Uppercase(Copy(Path, 1, 1));
end;

function FreeMbOn(const Path: String): Integer;
var
  FreeBytes, TotalBytes: Int64;
begin
  if GetSpaceOnDisk64(AddBackslash(DriveOf(Path) + ':'), FreeBytes, TotalBytes) then
    Result := FreeBytes / 1048576
  else
    Result := -1;
end;

function RoomIsEnough(const Dir: String): Boolean;
var
  NeedInstall, NeedCache, FreeThere: Integer;
  CachePath: String;
begin
  Result := True;
  // Vaenyx itself unpacks to about 120 MB, plus whatever was ticked, plus
  // headroom so the first run has somewhere to write.
  NeedInstall := 120 + DownloadMb() + 200;
  FreeThere := FreeMbOn(Dir);
  if (FreeThere >= 0) and (FreeThere < NeedInstall) then begin
    SuppressibleMsgBox(FmtMessage(CustomMessage('NoRoom'), [
      DriveOf(Dir), IntToStr(NeedInstall), IntToStr(FreeThere)]),
      mbError, MB_OK, IDOK);
    Result := False;
    exit;
  end;
  CachePath := ExpandConstant('{localappdata}');
  if DriveOf(CachePath) <> DriveOf(Dir) then begin
    NeedCache := DownloadMb() * 3 / 2;
    FreeThere := FreeMbOn(CachePath);
    if (NeedCache > 0) and (FreeThere >= 0) and (FreeThere < NeedCache) then begin
      SuppressibleMsgBox(FmtMessage(CustomMessage('NoRoomCache'), [
        DriveOf(CachePath), IntToStr(NeedCache), IntToStr(FreeThere)]),
        mbError, MB_OK, IDOK);
      Result := False;
    end;
  end;
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
    if Result then Result := RoomIsEnough(Dir);
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
    // What the component page was ticked for. Setup writes the list into
    // userdata and downloads none of it - Vaenyx fetches each one on its
    // first boot, where every one of those installers already lives.
    if ChosenComponents() <> '' then
      Params := Params + ' -Components "' + ChosenComponents() + '"';
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
  // Done here rather than in InitializeWizard because the folder is not known
  // until this page is shown, and on an upgrade it is the folder that says
  // which components are already on this machine.
  if CurPageID = wpSelectDir then MarkAlreadyInstalled(WizardForm.DirEdit.Text);
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
  // Answered once at the start of uninstall, acted on before the app files
  // are removed. Defaults to keeping the data.
  DeleteUserData: Boolean;

function YesNo(Value: Boolean): String;
begin
  if Value then Result := 'yes' else Result := 'no';
end;

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
    Log('Vaenyx uninstall: delete userdata = ' + YesNo(DeleteUserData));
    // Remove the boot task, then stop the running server the same way the
    // Stop button does. Both are best-effort: a half-registered task must not
    // block an uninstall.
    Exec(ExpandConstant('{sys}\schtasks.exe'), '/End /TN "VaenyxAutostart"',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec(ExpandConstant('{sys}\schtasks.exe'), '/Delete /TN "VaenyxAutostart" /F',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Log('Vaenyx uninstall: autostart task delete exit code ' + IntToStr(ResultCode));
    StopScript := ExpandConstant('{app}\scripts\Vaenyx-Stop.ps1');
    if FileExists(StopScript) then begin
      Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
        '-NoProfile -ExecutionPolicy Bypass -File "' + StopScript + '"',
        ExpandConstant('{app}'), SW_SHOW, ewWaitUntilTerminated, ResultCode);
      Log('Vaenyx uninstall: stop script exit code ' + IntToStr(ResultCode));
    end;
    // What setup BUILT (node_modules and the compiled trees) is not in the
    // uninstaller's file log, so it is removed here, in the same step, right
    // after the server stops — this used to sit in usPostUninstall, which in
    // a silent uninstall was observed never to run these at all, leaving a
    // gigabyte of build output behind. The personal folders (userdata\, and
    // private\ with the sign-in secrets) strictly follow the user's choice.
    Log('Vaenyx uninstall: DelTree node_modules = '
      + YesNo(DelTree(ExpandConstant('{app}\node_modules'), True, True, True)));
    Log('Vaenyx uninstall: DelTree apps = '
      + YesNo(DelTree(ExpandConstant('{app}\apps'), True, True, True)));
    Log('Vaenyx uninstall: DelTree packages = '
      + YesNo(DelTree(ExpandConstant('{app}\packages'), True, True, True)));
    if DeleteUserData then begin
      Log('Vaenyx uninstall: DelTree userdata = '
        + YesNo(DelTree(ExpandConstant('{app}\userdata'), True, True, True)));
      Log('Vaenyx uninstall: DelTree private = '
        + YesNo(DelTree(ExpandConstant('{app}\private'), True, True, True)));
    end;
  end;
  if CurUninstallStep = usPostUninstall then begin
    if DeleteUserData then
      RemoveDir(ExpandConstant('{app}'))
    else
      SuppressibleMsgBox(
        FmtMessage(CustomMessage('DataKept'), [ExpandConstant('{app}\userdata')]),
        mbInformation, MB_OK, IDOK);
  end;
end;
