import AVFoundation
import ExpoModulesCore

// Läser upp ett skrivet tjat med telefonens bästa röst och sparar det som en
// wav-fil. Filen används sedan precis som en inspelning: i appen, som
// notisljud när telefonen är låst och i vaktens larm.
public class TjatTalModule: Module {
  private var writers: [SpokenFileWriter] = []

  public func definition() -> ModuleDefinition {
    Name("TjatTal")

    AsyncFunction("speakToFile") { (text: String, fileUri: String, promise: Promise) in
      guard let url = URL(string: fileUri) else {
        promise.reject("TJAT_TAL", "Ogiltig sökväg: \(fileUri)")
        return
      }
      let writer = SpokenFileWriter()
      self.writers.append(writer) // syntesen lever bara så länge någon håller i den
      writer.write(text: text, voice: Self.bestVoice(), to: url) { error in
        // Syntesen svarar på sin egen tråd - tillbaka till huvudtråden
        DispatchQueue.main.async {
          self.writers.removeAll { $0 === writer }
          if let error {
            promise.reject("TJAT_TAL", error.localizedDescription)
          } else {
            promise.resolve(fileUri)
          }
        }
      }
    }.runOnQueue(.main)
  }

  // Bästa installerade rösten för telefonens språk: premium före förbättrad
  // före standard. Specialröster (robot, viskning) och egna personliga röster
  // hoppas över.
  static func bestVoice() -> AVSpeechSynthesisVoice? {
    let language = AVSpeechSynthesisVoice.currentLanguageCode()
    let usable = AVSpeechSynthesisVoice.speechVoices().filter { voice in
      // Rösttyperna finns först från iOS 17 - äldre system har inga specialröster
      guard #available(iOS 17.0, *) else { return true }
      return !voice.voiceTraits.contains(.isNoveltyVoice) && !voice.voiceTraits.contains(.isPersonalVoice)
    }
    let exact = usable.filter { $0.language == language }
    let sameLanguage = usable.filter { $0.language.hasPrefix(String(language.prefix(2))) }
    let pool = exact.isEmpty ? sameLanguage : exact
    return pool.max { $0.quality.rawValue < $1.quality.rawValue } ?? AVSpeechSynthesisVoice(language: language)
  }
}

// Skriver talsyntesen till en 16-bitars wav - ett format iOS godtar som notisljud
final class SpokenFileWriter {
  private let synthesizer = AVSpeechSynthesizer()
  private var file: AVAudioFile?
  private var finished = false

  func write(text: String, voice: AVSpeechSynthesisVoice?, to url: URL, done: @escaping (Error?) -> Void) {
    let utterance = AVSpeechUtterance(string: text)
    utterance.voice = voice
    try? FileManager.default.removeItem(at: url)

    synthesizer.write(utterance) { [weak self] buffer in
      guard let self, !self.finished, let pcm = buffer as? AVAudioPCMBuffer else { return }
      // En tom buffert betyder att talet är färdigt
      if pcm.frameLength == 0 {
        self.finish(nil, done)
        return
      }
      do {
        if self.file == nil {
          let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: pcm.format.sampleRate,
            AVNumberOfChannelsKey: pcm.format.channelCount,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
          ]
          self.file = try AVAudioFile(
            forWriting: url,
            settings: settings,
            commonFormat: pcm.format.commonFormat,
            interleaved: pcm.format.isInterleaved
          )
        }
        try self.file?.write(from: pcm)
      } catch {
        self.finish(error, done)
      }
    }
  }

  private func finish(_ error: Error?, _ done: (Error?) -> Void) {
    finished = true
    file = nil // stänger filen och skriver klart wav-huvudet
    done(error)
  }
}
