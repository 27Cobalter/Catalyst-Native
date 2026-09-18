package com.natsuneko.catalyst.downloader

import android.app.DownloadManager
import android.content.Context
import android.os.Environment
import androidx.core.net.toUri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * 画像の保存を端末標準のダウンロードマネージャに任せる。
 * 進捗・完了通知、通知タップで画像を開く動作、Pictures 以下への配置と MediaStore への登録は
 * すべて OS 側が面倒を見るため、アプリ側で通知チャンネルや通知権限を用意する必要がない。
 */
class CatalystDownloaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CatalystDownloader")

    AsyncFunction("enqueueImageDownload") { url: String, relativePath: String, mimeType: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

      val request =
        DownloadManager.Request(url.toUri())
          .setMimeType(mimeType)
          // 完了後も通知を残す。タップすると OS が ACTION_VIEW を投げ、画像を開けるアプリが並ぶ
          .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
          // 通知に出るタイトルは、指定しなければ保存先のファイル名がそのまま使われる
          .setDestinationInExternalPublicDir(Environment.DIRECTORY_PICTURES, relativePath)

      downloadManager.enqueue(request)
    }
  }
}
