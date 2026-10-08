package expo.modules.seugimediapicker

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID

private const val PICK_IMAGE_REQUEST_CODE = 6174

class SeugiMediaPickerModule : Module() {
  private var pendingPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("SeugiMediaPicker")

    AsyncFunction("pickImage") { promise: Promise ->
      if (pendingPromise != null) {
        throw IllegalStateException("이미 사진 선택기가 열려 있습니다")
      }
      pendingPromise = promise
      val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "image/*"
      }
      try {
        appContext.throwingActivity.startActivityForResult(intent, PICK_IMAGE_REQUEST_CODE)
      } catch (error: Exception) {
        pendingPromise = null
        promise.reject("PICKER_UNAVAILABLE", error.message ?: "사진 선택기를 열 수 없습니다", error)
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, (requestCode, resultCode, intent) ->
      if (requestCode != PICK_IMAGE_REQUEST_CODE) return@OnActivityResult
      val promise = pendingPromise ?: return@OnActivityResult
      pendingPromise = null

      val uri = intent?.data
      if (resultCode != Activity.RESULT_OK || uri == null) {
        promise.resolve(mapOf("canceled" to true))
        return@OnActivityResult
      }

      try {
        promise.resolve(copySelectedImage(uri))
      } catch (error: Exception) {
        promise.reject("IMAGE_READ_FAILED", error.message ?: "사진을 불러오지 못했습니다", error)
      }
    }
  }

  private fun copySelectedImage(uri: Uri): Map<String, Any> {
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    val resolver = context.contentResolver
    val mimeType = resolver.getType(uri) ?: "image/jpeg"
    var originalName: String? = null
    var size: Long? = null
    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) {
        originalName = cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME))
        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex)
      }
    }

    val extension = when (mimeType.lowercase()) {
      "image/png" -> "png"
      "image/webp" -> "webp"
      "image/heic" -> "heic"
      "image/heif" -> "heif"
      "image/gif" -> "gif"
      else -> originalName?.substringAfterLast('.', "jpg")?.takeIf { it.length in 1..8 } ?: "jpg"
    }
    val name = originalName?.takeIf { it.isNotBlank() } ?: "seugi-${UUID.randomUUID()}.$extension"
    val destination = File(context.cacheDir, "seugi-${UUID.randomUUID()}.$extension")
    resolver.openInputStream(uri).use { input ->
      requireNotNull(input) { "사진을 읽을 수 없습니다" }
      destination.outputStream().use(input::copyTo)
    }

    return mapOf(
      "canceled" to false,
      "assets" to listOf(mapOf(
        "uri" to Uri.fromFile(destination).toString(),
        "name" to name,
        "mimeType" to mimeType,
        "size" to (size ?: destination.length()),
      )),
    )
  }
}
