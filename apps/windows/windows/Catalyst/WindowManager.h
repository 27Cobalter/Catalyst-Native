#pragma once

#include "NativeModules.h"
#include "resource.h"

#include <commctrl.h>

#include <algorithm>
#include <map>
#include <optional>
#include <string>

namespace Catalyst {

namespace MRN = winrt::Microsoft::ReactNative;
namespace Windowing = winrt::Microsoft::UI::Windowing;

// JS 側 (index.js) で別ウィンドウ用に登録しているコンポーネント名
inline constexpr wchar_t SceneWindowComponentName[] = L"CatalystWindow";

// これより狭くするとサイドバーのレールとタイムラインが両立しなくなる (DIP)
inline constexpr int MinimumWindowWidth = 360;
inline constexpr int MinimumWindowHeight = 480;

// 新しいウィンドウを前のウィンドウから少しずらして開く量 (DIP)
inline constexpr int CascadeOffset = 32;

inline double ScaleForWindow(Windowing::AppWindow const &window) noexcept {
  auto hwnd = winrt::Microsoft::UI::GetWindowFromWindowId(window.Id());
  auto dpi = hwnd ? GetDpiForWindow(hwnd) : 0;
  return (dpi ? dpi : USER_DEFAULT_SCREEN_DPI) / static_cast<double>(USER_DEFAULT_SCREEN_DPI);
}

// AppWindow の Resize / Move は物理ピクセル単位のため、そのまま渡すと拡大率 125% / 150% の環境で小さく開いてしまう。
// ウィンドウが属するモニターの DPI から毎回換算し、最小サイズは WM_GETMINMAXINFO で DPI が変わるたびに計算し直す
inline LRESULT CALLBACK MinimumSizeSubclassProc(
    HWND hwnd,
    UINT message,
    WPARAM wParam,
    LPARAM lParam,
    UINT_PTR /* subclassId */,
    DWORD_PTR /* refData */) noexcept {
  if (message == WM_GETMINMAXINFO) {
    auto info = reinterpret_cast<MINMAXINFO *>(lParam);
    auto dpi = GetDpiForWindow(hwnd);
    info->ptMinTrackSize.x = MulDiv(MinimumWindowWidth, dpi, USER_DEFAULT_SCREEN_DPI);
    info->ptMinTrackSize.y = MulDiv(MinimumWindowHeight, dpi, USER_DEFAULT_SCREEN_DPI);
    return 0;
  }
  return DefSubclassProc(hwnd, message, wParam, lParam);
}

inline void ConfigureWindow(Windowing::AppWindow const &window) noexcept {
  auto hwnd = winrt::Microsoft::UI::GetWindowFromWindowId(window.Id());
  SetWindowSubclass(hwnd, MinimumSizeSubclassProc, 1, 0);

  // タスクバーと Alt+Tab に exe と同じアイコンを出す
  if (auto icon = LoadIconW(GetModuleHandleW(nullptr), MAKEINTRESOURCEW(IDI_ICON1))) {
    window.SetIcon(winrt::Microsoft::UI::GetIconIdFromIcon(icon));
  }
}

// DIP で指定したサイズで、reference があればそこから少しずらした位置、なければ作業領域の中央に置く
inline void PlaceWindow(
    Windowing::AppWindow const &window,
    double widthDip,
    double heightDip,
    Windowing::AppWindow const &reference = nullptr) noexcept {
  auto anchor = reference ? reference : window;
  auto scale = ScaleForWindow(anchor);
  auto area = Windowing::DisplayArea::GetFromWindowId(anchor.Id(), Windowing::DisplayAreaFallback::Nearest).WorkArea();

  auto width = std::min(static_cast<int32_t>(widthDip * scale), area.Width);
  auto height = std::min(static_cast<int32_t>(heightDip * scale), area.Height);
  auto x = area.X + (area.Width - width) / 2;
  auto y = area.Y + (area.Height - height) / 2;

  if (reference) {
    auto offset = static_cast<int32_t>(CascadeOffset * scale);
    x = std::clamp(reference.Position().X + offset, area.X, area.X + area.Width - width);
    y = std::clamp(reference.Position().Y + offset, area.Y, area.Y + area.Height - height);
  }

  window.MoveAndResize({x, y, width, height});
}

// メインウィンドウと同じ ReactNativeHost (= 同じ JS ランタイム) に island を追加する形で別ウィンドウを管理する。
// JS の状態 (Jotai / キャッシュ / 認証情報) をウィンドウ間で共有できる
class SceneWindows {
 public:
  static SceneWindows &Instance() noexcept {
    static SceneWindows instance;
    return instance;
  }

  void Initialize(MRN::ReactNativeHost const &host, Windowing::AppWindow const &mainWindow) noexcept {
    m_host = host;
    m_mainWindow = mainWindow;
  }

  void Open(std::wstring const &scene, std::wstring const &title, double width, double height) {
    if (!m_host)
      return;

    auto compositor = MRN::Composition::CompositionUIService::GetCompositor(m_host.InstanceSettings().Properties());
    auto window = MRN::ReactNativeWindow::CreateFromCompositor(compositor);
    auto appWindow = window.AppWindow();
    auto id = m_nextId++;

    appWindow.Title(title);
    ConfigureWindow(appWindow);
    PlaceWindow(appWindow, width, height, m_lastOpened ? m_lastOpened : m_mainWindow);

    MRN::ReactViewOptions options;
    options.ComponentName(SceneWindowComponentName);
    options.InitialProps([scene, id](MRN::IJSValueWriter const &writer) {
      writer.WriteObjectBegin();
      MRN::WriteProperty(writer, L"scene", scene);
      MRN::WriteProperty(writer, L"windowId", id);
      writer.WriteObjectEnd();
    });
    window.ReactNativeIsland().ReactViewHost(MRN::ReactCoreInjection::MakeViewHost(m_host, options));

    // 閉じるボタンでは既定の破棄をキャンセルし、React ツリーをアンマウントしてから破棄する
    appWindow.Closing([this, id](auto const &, Windowing::AppWindowClosingEventArgs const &args) {
      args.Cancel(true);
      Close(id);
    });

    m_windows.emplace(id, window);
    m_lastOpened = appWindow;
    appWindow.Show();
  }

  void Close(int id) noexcept {
    auto it = m_windows.find(id);
    if (it == m_windows.end())
      return;

    auto window = it->second;
    m_windows.erase(it);
    if (m_lastOpened == window.AppWindow())
      m_lastOpened = nullptr;

    // Closing イベントの中で AppWindow を破棄しないよう、次のメッセージループで閉じる
    winrt::Microsoft::UI::Dispatching::DispatcherQueue::GetForCurrentThread().TryEnqueue([window]() {
      window.ReactNativeIsland().ReactViewHost(nullptr);
      window.Close();
    });
  }

  // メインウィンドウを閉じたらアプリごと終了するため、ReactNativeHost を破棄する前に別ウィンドウを片付ける
  void CloseAll() noexcept {
    for (auto &[id, window] : m_windows) {
      window.ReactNativeIsland().ReactViewHost(nullptr);
      window.Close();
    }
    m_windows.clear();
    m_lastOpened = nullptr;
  }

  void SetTitle(int id, std::wstring const &title) noexcept {
    if (auto it = m_windows.find(id); it != m_windows.end())
      it->second.AppWindow().Title(title);
  }

 private:
  MRN::ReactNativeHost m_host{nullptr};
  Windowing::AppWindow m_mainWindow{nullptr};
  Windowing::AppWindow m_lastOpened{nullptr};
  std::map<int, MRN::ReactNativeWindow> m_windows;
  int m_nextId{1};
};

REACT_MODULE(WindowManager)
struct WindowManager {
  REACT_INIT(Initialize)
  void Initialize(MRN::ReactContext const &context) noexcept {
    m_context = context;
  }

  REACT_METHOD(OpenWindow, L"openWindow")
  void OpenWindow(std::string scene, std::string title, double width, double height) noexcept {
    m_context.UIDispatcher().Post([scene = winrt::to_hstring(scene), title = winrt::to_hstring(title), width, height]() {
      SceneWindows::Instance().Open(std::wstring{scene}, std::wstring{title}, width, height);
    });
  }

  REACT_METHOD(CloseWindow, L"closeWindow")
  void CloseWindow(int windowId) noexcept {
    m_context.UIDispatcher().Post([windowId]() { SceneWindows::Instance().Close(windowId); });
  }

  REACT_METHOD(SetWindowTitle, L"setWindowTitle")
  void SetWindowTitle(int windowId, std::string title) noexcept {
    m_context.UIDispatcher().Post(
        [windowId, title = winrt::to_hstring(title)]() { SceneWindows::Instance().SetTitle(windowId, std::wstring{title}); });
  }

 private:
  MRN::ReactContext m_context;
};

} // namespace Catalyst
