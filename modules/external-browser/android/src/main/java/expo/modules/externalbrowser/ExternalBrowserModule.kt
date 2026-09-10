package expo.modules.externalbrowser

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * 指定したブラウザーアプリで URL を開く。
 *
 * React Native の Linking も expo-web-browser も intent にパッケージを固定できないため、
 * Android では次の 2 つを避けられない:
 *
 * - 暗黙の ACTION_VIEW が App Link 経由で Catalyst 自身に解決され、ブラウザに到達しない
 * - ユーザーが選んだブラウザーではなく、端末の既定ブラウザーが開いてしまう
 *
 * どちらも `Intent.setPackage()` で解決できるので、それだけを行う最小のモジュールを置いている。
 * 明示的な intent の起動には package visibility の宣言は不要。
 */
class ExternalBrowserModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExternalBrowser")

    /**
     * @param url 開く URL
     * @param packageName 開かせるブラウザーのパッケージ名。null の場合はブラウザー全般に解決させる
     * @return 起動できたかどうか。false の場合、呼び出し側で別の方法にフォールバックする
     */
    AsyncFunction("openUrl") { url: String, packageName: String? ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
        addCategory(Intent.CATEGORY_BROWSABLE)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        if (!packageName.isNullOrEmpty()) {
          setPackage(packageName)
        } else {
          // パッケージが判らない場合でも、解決先をブラウザーだけに限定する。
          // 素の暗黙 ACTION_VIEW は検証済み App Link で Catalyst 自身に戻ってしまうため、
          // ホストを持たない "http:" を selector にしてブラウザーの intent filter だけに一致させる
          // (App Link 側の filter は host を要求するので一致しない)。
          selector = Intent(Intent.ACTION_VIEW, Uri.fromParts("http", "", null)).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
          }
        }
      }

      try {
        (appContext.currentActivity ?: context).startActivity(intent)
        true
      } catch (_: ActivityNotFoundException) {
        false
      }
    }
  }
}
