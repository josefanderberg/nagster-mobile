import ExpoModulesCore
import Speech

// Lyssnar på en inspelning och ger tillbaka texten, så att ett inspelat tjat
// kan få en riktig titel. Tolkningen sker bara i telefonen - stödjer den inte
// telefonens språk på enheten ger vi upp i stället för att skicka ljudet till
// Apple, så att inget lämnar telefonen.
public class TjatLyssnaModule: Module {
  private var recognizer: SFSpeechRecognizer?
  private var task: SFSpeechRecognitionTask?

  public func definition() -> ModuleDefinition {
    Name("TjatLyssna")

    // Ger texten, eller nil om det inte gick (inget lov, inget stöd, ingen text)
    AsyncFunction("transcribe") { (fileUri: String, promise: Promise) in
      guard let url = URL(string: fileUri) else {
        promise.resolve(nil)
        return
      }
      SFSpeechRecognizer.requestAuthorization { status in
        DispatchQueue.main.async {
          guard status == .authorized,
                let recognizer = SFSpeechRecognizer(locale: Locale.current),
                recognizer.isAvailable,
                recognizer.supportsOnDeviceRecognition
          else {
            promise.resolve(nil)
            return
          }
          let request = SFSpeechURLRecognitionRequest(url: url)
          request.requiresOnDeviceRecognition = true
          request.shouldReportPartialResults = false

          var answered = false
          self.recognizer = recognizer
          self.task = recognizer.recognitionTask(with: request) { result, error in
            guard !answered else { return }
            if let result, result.isFinal {
              answered = true
              promise.resolve(result.bestTranscription.formattedString)
            } else if error != nil {
              answered = true
              promise.resolve(nil)
            }
          }
        }
      }
    }
  }
}
