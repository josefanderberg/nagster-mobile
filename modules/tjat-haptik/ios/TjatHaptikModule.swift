import AVFoundation
import CoreHaptics
import ExpoModulesCore

// Två saker som expo-haptics inte kan:
// - haptik medan mikrofonen spelar in (iOS stänger annars av den)
// - en ihållande vibration utan pauser, till rörelsevaktens larm
public class TjatHaptikModule: Module {
  private var engine: CHHapticEngine?
  private var player: CHHapticAdvancedPatternPlayer?
  private var buzzing = false

  public func definition() -> ModuleDefinition {
    Name("TjatHaptik")

    Function("allowDuringRecording") {
      try? AVAudioSession.sharedInstance().setAllowHapticsAndSystemSoundsDuringRecording(true)
    }

    // Ger false om telefonen saknar Core Haptics - då får JS ta över
    Function("startBuzz") { () -> Bool in
      guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return false }
      self.buzzing = true
      return self.play()
    }

    Function("stopBuzz") {
      self.buzzing = false
      try? self.player?.stop(atTime: CHHapticTimeImmediate)
      self.player = nil
      self.engine?.stop(completionHandler: nil)
    }
  }

  private func play() -> Bool {
    do {
      let engine = try self.engine ?? makeEngine()
      self.engine = engine
      try engine.start()

      // Ett kraftigt surr som loopas tills stopBuzz
      let buzz = CHHapticEvent(
        eventType: .hapticContinuous,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.5),
        ],
        relativeTime: 0,
        duration: 2
      )
      let player = try engine.makeAdvancedPlayer(with: CHHapticPattern(events: [buzz], parameters: []))
      player.loopEnabled = true
      try player.start(atTime: CHHapticTimeImmediate)
      self.player = player
      return true
    } catch {
      return false
    }
  }

  private func makeEngine() throws -> CHHapticEngine {
    let engine = try CHHapticEngine()
    engine.playsHapticsOnly = true
    engine.isAutoShutdownEnabled = false
    // Systemet kan stoppa motorn, t.ex. när larmrösten tar ljudet. Pågår
    // larmet startas surret om direkt.
    engine.stoppedHandler = { [weak self] _ in
      DispatchQueue.main.async { self?.resume() }
    }
    engine.resetHandler = { [weak self] in
      DispatchQueue.main.async { self?.resume() }
    }
    return engine
  }

  private func resume() {
    guard buzzing else { return }
    _ = play()
  }
}
