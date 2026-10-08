import ExpoModulesCore
import PhotosUI
import UniformTypeIdentifiers

public final class SeugiMediaPickerModule: Module {
  private var pickerDelegate: SeugiPhotoPickerDelegate?

  public func definition() -> ModuleDefinition {
    Name("SeugiMediaPicker")

    AsyncFunction("pickImage") { (promise: Promise) in
      guard let viewController = appContext?.utilities?.currentViewController() else {
        promise.reject("PICKER_UNAVAILABLE", "사진 선택기를 열 수 없습니다")
        return
      }

      var configuration = PHPickerConfiguration()
      configuration.filter = .images
      configuration.selectionLimit = 1

      let picker = PHPickerViewController(configuration: configuration)
      let delegate = SeugiPhotoPickerDelegate(promise: promise) { [weak self] in
        self?.pickerDelegate = nil
      }
      pickerDelegate = delegate
      picker.delegate = delegate
      viewController.present(picker, animated: true)
    }.runOnQueue(.main)
  }
}

private final class SeugiPhotoPickerDelegate: NSObject, PHPickerViewControllerDelegate {
  private var promise: Promise?
  private let onFinish: () -> Void

  init(promise: Promise, onFinish: @escaping () -> Void) {
    self.promise = promise
    self.onFinish = onFinish
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    guard let result = results.first else {
      promise?.resolve(["canceled": true])
      finish()
      return
    }

    let provider = result.itemProvider
    let typeIdentifier = provider.registeredTypeIdentifiers.first(where: { UTType($0)?.conforms(to: .image) }) ?? UTType.image.identifier
    provider.loadFileRepresentation(forTypeIdentifier: typeIdentifier) { [weak self] source, error in
      guard let self else { return }
      guard let source, error == nil else {
        self.promise?.reject("IMAGE_READ_FAILED", error?.localizedDescription ?? "사진을 불러오지 못했습니다")
        self.finish()
        return
      }

      do {
        let fileName = "seugi-\(UUID().uuidString).\(source.pathExtension.isEmpty ? "jpg" : source.pathExtension)"
        let destination = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try FileManager.default.copyItem(at: source, to: destination)
        let values = try destination.resourceValues(forKeys: [.fileSizeKey])
        let mimeType = UTType(filenameExtension: destination.pathExtension)?.preferredMIMEType ?? "image/jpeg"
        self.promise?.resolve([
          "canceled": false,
          "assets": [[
            "uri": destination.absoluteString,
            "name": fileName,
            "mimeType": mimeType,
            "size": values.fileSize ?? 0,
          ]],
        ])
      } catch {
        self.promise?.reject("IMAGE_COPY_FAILED", error.localizedDescription)
      }
      self.finish()
    }
  }

  private func finish() {
    promise = nil
    onFinish()
  }
}
