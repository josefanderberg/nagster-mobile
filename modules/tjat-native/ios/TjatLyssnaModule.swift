import AVFoundation
import ExpoModulesCore
import Speech

// Lyssnar på en inspelning och ger tillbaka texten, så att ett inspelat tjat
// kan få en riktig titel. Tolkningen sker bara i telefonen och inget ljud
// lämnar den. Från iOS 26 används den nya dikteringsmodellen, som klarar
// svenska i telefonen. Den äldre taligenkänningen klarar oftast bara engelska
// utan internet, så den är bara reserv.
public class TjatLyssnaModule: Module {
  private var recognizer: SFSpeechRecognizer?
  private var task: SFSpeechRecognitionTask?

  public func definition() -> ModuleDefinition {
    Name("TjatLyssna")

    // Frågar om lov och hämtar språkmodellen redan när man börjar prata in,
    // så att allt är klart när inspelningen är det. Första gången laddas
    // modellen ner.
    Function("prepare") {
      _ = Task {
        _ = await Self.authorized()
        if #available(iOS 26.0, *) { _ = try? await Self.dictationModel() }
      }
    }

    // Ger texten, eller nil om det inte gick (inget lov, inget stöd, ingen text)
    AsyncFunction("transcribe") { (fileUri: String) async -> String? in
      guard let url = URL(string: fileUri) else { return nil }
      if #available(iOS 26.0, *), let text = try? await Self.dictate(url), !text.isEmpty {
        return text
      }
      return await self.recognize(url)
    }
  }

  // Telefonens språk. Locale.current följer appens egna språk och blir
  // därför "en_SE" på en svensk telefon, vilket ingen taligenkänning kan.
  private static var phoneLocale: Locale {
    Locale(identifier: Locale.preferredLanguages.first ?? Locale.current.identifier)
  }

  // Dikteringsmodellen för telefonens språk, nedladdad och klar att använda
  @available(iOS 26.0, *)
  private static func dictationModel() async throws -> DictationTranscriber? {
    guard let locale = await DictationTranscriber.supportedLocale(equivalentTo: phoneLocale) else { return nil }
    let transcriber = DictationTranscriber(locale: locale, preset: .shortDictation)
    if let download = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
      try await download.downloadAndInstall()
    }
    return transcriber
  }

  @available(iOS 26.0, *)
  private static func dictate(_ url: URL) async throws -> String? {
    guard let transcriber = try await dictationModel() else { return nil }
    let analyzer = SpeechAnalyzer(modules: [transcriber])
    let file = try AVAudioFile(forReading: url)

    // Färdiga stycken läggs ihop. Det sista kan vara en preliminär gissning,
    // som byts ut tills den blir färdig - den tas med om inget annat hann bli klart.
    let text = Task { () throws -> String in
      var finished = ""
      var latest = ""
      for try await result in transcriber.results {
        let part = String(result.text.characters)
        if result.isFinal {
          finished += part
          latest = ""
        } else {
          latest = part
        }
      }
      return finished + latest
    }
    try await analyzer.start(inputAudioFile: file, finishAfterFile: true)
    return try await text.value.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  // Den äldre taligenkänningen, bara om den klarar språket i telefonen
  private func recognize(_ url: URL) async -> String? {
    guard await Self.authorized(),
          let recognizer = SFSpeechRecognizer(locale: Self.phoneLocale),
          recognizer.isAvailable,
          recognizer.supportsOnDeviceRecognition
    else { return nil }

    let request = SFSpeechURLRecognitionRequest(url: url)
    request.requiresOnDeviceRecognition = true
    request.shouldReportPartialResults = false

    return await withCheckedContinuation { continuation in
      DispatchQueue.main.async {
        var answered = false
        self.recognizer = recognizer
        self.task = recognizer.recognitionTask(with: request) { result, error in
          guard !answered else { return }
          if let result, result.isFinal {
            answered = true
            continuation.resume(returning: result.bestTranscription.formattedString)
          } else if error != nil {
            answered = true
            continuation.resume(returning: nil)
          }
        }
      }
    }
  }

  private static func authorized() async -> Bool {
    await withCheckedContinuation { continuation in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status == .authorized)
      }
    }
  }
}
