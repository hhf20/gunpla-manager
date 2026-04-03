!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "WinMessages.nsh"

!ifdef BUILD_UNINSTALLER
  Var uninstallWipeData
  Var uninstallWipeCheckbox

  Function un.UninstallDataPageCreate
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 36u "是否同时清除本机所有数据？$\r$\n（包含机体数据、图片、设置、日志。此操作不可恢复）"
    Pop $0

    ${NSD_CreateCheckbox} 0 44u 100% 12u "清除所有数据"
    Pop $uninstallWipeCheckbox
    ${NSD_SetState} $uninstallWipeCheckbox ${BST_UNCHECKED}

    nsDialogs::Show
  FunctionEnd

  Function un.UninstallDataPageLeave
    ${NSD_GetState} $uninstallWipeCheckbox $uninstallWipeData
  FunctionEnd

  !macro customUnWelcomePage
    UninstPage custom un.UninstallDataPageCreate un.UninstallDataPageLeave
  !macroend

  !macro customUnInstall
    ${If} $uninstallWipeData == ${BST_CHECKED}
      ${if} $installMode == "all"
        SetShellVarContext current
      ${endif}
      RMDir /r "$APPDATA\${APP_FILENAME}"
      !ifdef APP_PRODUCT_FILENAME
        RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
      !endif
      !ifdef APP_PACKAGE_NAME
        RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
      !endif
      ${if} $installMode == "all"
        SetShellVarContext all
      ${endif}
    ${EndIf}
  !macroend
!endif
